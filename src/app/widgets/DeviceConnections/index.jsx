import React, { PureComponent } from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import isElectron from 'is-electron';
// import cx from 'classnames';
import log from 'app/lib/log';
import i18n from 'app/lib/i18n';
import store from 'app//store';
import portal from 'app/lib/portal';
import espController from 'app/lib/controller';
import { ToastNotification } from 'app/components/Notifications';
import { GRBL,
  GRBL_ACTIVE_STATE_IDLE,
  GRBL_ACTIVE_STATE_RUN,
  GRBL_ACTIVE_STATE_HOLD,
  GRBL_ACTIVE_STATE_DOOR,
  GRBL_ACTIVE_STATE_HOME,
  GRBL_ACTIVE_STATE_SLEEP,
  GRBL_ACTIVE_STATE_ALARM,
  GRBL_ACTIVE_STATE_CHECK } from 'app/constants';
import io from 'socket.io-client';
import FacebookLoading from 'react-facebook-loading';
import styles from './index.styl';
import ConnectedDevice from './ConnectedDevice';
import GamepadConnection from './GamepadConnection';
import ComputerConnectionModal from './ComputerConnectionModal';

class DeviceConnections extends PureComponent {
    static propTypes = {
      deviceMode: PropTypes.string
    };

    state = this.getInitialState();

    computerConnectionSocket = null;

    phoneBLEConnectionSocket = null;

    gamepadBLEConnectionSocket = null;

    gamepadConnection = new GamepadConnection();

    espControllerEvents = {
      'serialport:list': (ports) => {
        const { espPortManufacturer, espBaudrate, computerPortManufacturer } = this.state;

        log.debug('Received a list of serial ports:', ports);

        this.setState(state => ({
          ports: ports,
        }));

        ports.forEach(async (port) => {
          if (port.manufacturer === espPortManufacturer) {
            if (isElectron()) {
              const { ipcRenderer } = window.require('electron');
              await ipcRenderer.invoke('check-updates-for-esp', port);

              this.setState(state => ({
                alertMessage: 'ESP is updating!. Please wait.'
              }));

              ipcRenderer.removeAllListeners('finish-esp-update');
              ipcRenderer.on('finish-esp-update', (event, message) => {
                this.espOpenPort(port, {
                  baudrate: espBaudrate
                });
              });
            } else {
              this.espOpenPort(port, {
                baudrate: espBaudrate
              });
            }
          }

          if (port.manufacturer === computerPortManufacturer) {
            this.setState(state => ({
              computerPort: port,
            }));
          }
        });

        const hasEspPortManufacturer = ports.some(port => port.manufacturer === espPortManufacturer);
        if (!hasEspPortManufacturer) {
          this.setState(state => ({
            alertMessage: 'Rownd port not found', // TODO: Localization
            espPort: null,
          }));
        }
      },
      'serialport:change': (options) => {
        log.debug('serialport:change', options); // TODO: Port Değişikliği
        espController.command('reset');
      },
      'serialport:open': (options) => {
        log.debug('serialport:open', options);
        const { controllerType, port, baudrate, controllerState } = options;

        this.setState(state => ({
          alertMessage: '',
          espConnecting: false,
          espConnected: true,
          espController: {
            ...state.espController,
            type: controllerType,
            state: controllerState
          },
          espPort: options,
          espBaudrate: baudrate,
        }), () => {
          this.connectPhoneBLEConnectionSocket();
          this.connectComputerConnectionSocket();
        });

        log.debug(`Established a connection to the serial port "${port}"`);
      },
      'serialport:close': (options) => {
        const { port } = options;

        log.debug(`The serial port "${port}" is disconected`);

        this.setState(state => ({
          alertMessage: `The serial port "${port}" is disconected`,
          espConnecting: false,
          espConnected: false
        }));
      },
      'serialport:error': (options) => {
        const { port } = options;

        this.setState(state => ({
          alertMessage: i18n._('Error opening serial port \'{{- port}}\'', { port: port }),
          espConnecting: false,
          espConnected: false
        }));

        log.error(`Error opening serial port "${port}"`);
      },
      'controller:state': (type, controllerState) => {
        // Grbl
        if (type === GRBL) {
          this.setState(state => ({
            espController: {
              ...state.espController,
              type: type,
              state: controllerState
            },
          }));
        }
      }
    }

    componentDidMount() {
      this.addEspControllerEvents();
      this.espRefreshPorts();

      this.gamepadConnection.start();

      this.gamepadConnection.on('gamepad:connect', (gamepad) => {
        this.setState(state => ({
          gamepadConnected: true
        }));
      });
      this.gamepadConnection.on('gamepad:disconnect', (gamepad) => {
        this.setState(state => ({
          gamepadConnected: false
        }));
      });
    }

    componentWillUnmount() {
      this.removeEspControllerEvents();

      this.gamepadConnection.stop();
    }

    getInitialState() {
      return {
        loading: false,
        ports: [],
        espConnecting: false,
        espConnected: false,
        espPortManufacturer: 'Silicon Labs',
        espController: {
          settings: espController.settings,
          state: espController.state
        },
        espPort: espController.port,
        espBaudrate: 115200,
        computerConnecting: false,
        computerConnected: false,
        computerPort: {},
        computerPortManufacturer: 'FTDI',
        computerBaudrate: 115200,
        phoneBLEConnected: false,
        gamepadConnected: false,
        alertMessage: ''
      };
    }

    connectComputerConnectionSocket() {
      this.computerConnectionSocket && this.computerConnectionSocket.disconnect();

      const token = store.get('session.token');
      const host = '';
      const options = {
        query: 'token=' + token,
        path: '/computer-socket.io'
      };
      this.computerConnectionSocket = io.connect(host, options);

      this.computerConnectionSocket.on('connect', () => {
        log.debug('Socket.IO Computer sunucusuna bağlantı kuruldu.');
      });

      this.computerConnectionSocket.on('computer:error', (err) => {
        log.debug('computer:error', err);
      });

      this.computerConnectionSocket.on('computer:close', (err) => {
        log.debug('computer:close', err);
        this.setState(state => ({
          computerConnected: false
        }));
      });

      this.computerConnectionSocket.on('computer-esp:data', (data) => {
        log.debug('computer-esp:data', data);
      });
    }

    connectPhoneBLEConnectionSocket() {
      this.phoneBLEConnectionSocket && this.phoneBLEConnectionSocket.disconnect();

      const token = store.get('session.token');
      const host = '';
      const options = {
        query: 'token=' + token,
        path: '/phoneble-socket.io'
      };
      this.phoneBLEConnectionSocket = io.connect(host, options);

      this.phoneBLEConnectionSocket.on('connect', () => {
        log.debug('Socket.IO Phone BLE sunucusuna bağlantı kuruldu.');

        const espPort = this.state.espPort;

        this.phoneBLEConnectionSocket.emit('open', espPort, () => {
          log.debug('open', JSON.stringify(espPort));
        });
      });

      this.phoneBLEConnectionSocket.on('phoneble:connect', (clientAddress) => {
        this.setState(state => ({
          phoneBLEConnected: true
        }));
      });

      this.phoneBLEConnectionSocket.on('phoneble:disconnect', (clientAddress) => {
        this.setState(state => ({
          phoneBLEConnected: false
        }));
      });
    }

    addEspControllerEvents() {
      Object.keys(this.espControllerEvents).forEach(eventName => {
        const callback = this.espControllerEvents[eventName];
        espController.addListener(eventName, callback);
      });
    }

    removeEspControllerEvents() {
      Object.keys(this.espControllerEvents).forEach(eventName => {
        const callback = this.espControllerEvents[eventName];
        espController.removeListener(eventName, callback);
      });
    }

    startLoading() {
      this.setState(state => ({
        loading: true
      }));
    }

    stopLoading() {
      this.setState(state => ({
        loading: false
      }));
    }

    espRefreshPorts() {
      this.startLoading();
      espController.listPorts();
    }

    espOpenPort(port, options) {
      const { baudrate } = { ...options };

      if (!port) {
        this.setState(state => ({ alertMessage: 'Port not found' }));
        return;
      } // Localization

      this.setState(state => ({
        espConnecting: true
      }));

      espController.openPort(port.port, {
        controllerType: this.state.espController.type,
        baudrate: baudrate,
        rtscts: false,
        pin: {
          dtr: null,
          rts: null,
        },
      }, (err) => {
        if (err) {
          this.setState(state => ({
            alertMessage: i18n._('Error opening serial port \'{{- port}}\'', { port: port }),
            espConnecting: false,
            espConnected: false,
            loading: false
          }));

          log.error(err);
          return;
        }
        this.setState(state => ({
          alertMessage: '',
          espPort: port,
          loading: false
        }));
      });
    }

    espClosePort() {
      this.setState(state => ({
        espConnecting: false,
        espConnected: false
      }));
      espController.closePort(this.state.espPort.port, (err) => {
        if (err) {
          log.error(err);
          return;
        }
      });
    }

    openComputerConnection() {
      const espPort = this.state.espPort;
      const computerPort = this.state.computerPort;
      const baudrate = this.state.computerBaudrate;

      this.computerConnectionSocket.emit('open', espPort, computerPort, baudrate, (connection) => {
        log.debug('open', JSON.stringify(espPort), JSON.stringify(computerPort), connection);
        this.setState(state => ({
          computerConnected: !state.computerConnected
        }), () => {
          espController.command('computer-connection', this.state.computerConnected);
          this.openComputerConnectedPortal();
        });
      });
    }

    closeComputerConnection() {
      this.computerConnectionSocket.emit('close', (err) => {
        this.setState(state => ({
          computerConnected: !state.computerConnected
        }), () => {
          espController.command('computer-connection', this.state.computerConnected);
        });
      });
    }

    openComputerConnectedPortal() {
      portal(({ onClose }) => (
        <ComputerConnectionModal
          deviceMode={this.props.deviceMode} onClose={() => {
            this.closeComputerConnection();
            onClose();
          }}
        />
      ));
    }

    render() {
      const { espConnected, alertMessage, computerConnected, phoneBLEConnected, gamepadConnected, loading } = this.state;
      const activeState = _.get(this.state.espController.state, 'status.activeState');

      const grblStateText = {
        [GRBL_ACTIVE_STATE_IDLE]: i18n.t('controller:Grbl.activeState.idle'),
        [GRBL_ACTIVE_STATE_RUN]: i18n.t('controller:Grbl.activeState.run'),
        [GRBL_ACTIVE_STATE_HOLD]: i18n.t('controller:Grbl.activeState.hold'),
        [GRBL_ACTIVE_STATE_DOOR]: i18n.t('controller:Grbl.activeState.door'),
        [GRBL_ACTIVE_STATE_HOME]: i18n.t('controller:Grbl.activeState.home'),
        [GRBL_ACTIVE_STATE_SLEEP]: i18n.t('controller:Grbl.activeState.sleep'),
        [GRBL_ACTIVE_STATE_ALARM]: i18n.t('controller:Grbl.activeState.alarm'),
        [GRBL_ACTIVE_STATE_CHECK]: i18n.t('controller:Grbl.activeState.check')
      }[activeState];

      return (
        <div className={styles.deviceConnectionsWidget}>
          {alertMessage && (
            <ToastNotification
              style={{ position: 'absolute', right: '10px', top: '10px' }}
              type="error"
              onDismiss={() => this.setState(state => ({
                alertMessage: ''
              }))}
            >
              {alertMessage}
            </ToastNotification>
          )}
          {
            loading && (
              <FacebookLoading
                delay={400}
                zoom={2}
                style={{ margin: '20px auto' }}
              />
            )
          }
          {
            !loading && (
              <React.Fragment>
                <ConnectedDevice
                  className={styles.connectedDevice}
                  deviceName={`ESP (${this.state.espController.type}) - ${grblStateText}`}
                  isConnected={espConnected}
                  isManualConnectable
                  onTapAction={() => {
                    this.espRefreshPorts();
                  }}
                />
                <ConnectedDevice
                  className={styles.connectedDevice}
                  deviceName="Phone"
                  isConnected={phoneBLEConnected}
                  infoText="*For connect to phone please use your phone"
                  isManualConnectable={false}
                  onTapAction={() => {}}
                />
                <ConnectedDevice
                  className={styles.connectedDevice}
                  deviceName="Gamepad"
                  isConnected={gamepadConnected}
                  infoText="*For connect to phone please use your gamepad"
                  isManualConnectable={true}
                  onTapAction={async () => {
                    if (isElectron()) {
                      const { ipcRenderer } = window.require('electron');
                      await ipcRenderer.invoke('run-wireless-controller-script');
                    }
                  }}
                />
                <ConnectedDevice
                  className={styles.connectedDevice}
                  deviceName="Computer"
                  isConnected={computerConnected}
                  infoText="*For connect to computer please use your computer"
                  isManualConnectable={true}
                  onTapAction={() => {
                    if (this.state.computerConnected) {
                      this.closeComputerConnection();
                    } else {
                      this.openComputerConnection();
                    }
                  }}
                />
              </React.Fragment>
            )
          }
        </div>
      );
    }
}

export default DeviceConnections;
