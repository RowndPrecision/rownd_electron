import React, { PureComponent } from 'react';
import _ from 'lodash';
// import PropTypes from 'prop-types';
// import cx from 'classnames';
import log from 'app/lib/log';
import i18n from 'app/lib/i18n';
import store from 'app//store';
//import api from 'app/api';
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
import styles from './index.styl';
import ConnectedDevice from './ConnectedDevice';
import GamepadConnection from './GamepadConnection';

class DeviceConnections extends PureComponent {
    static propTypes = {
    };

    state = this.getInitialState();

    computerConnectionSocket = null;

    phoneBLEConnectionSocket = null;

    gamepadBLEConnectionSocket = null;

    gamepadConnection = new GamepadConnection();

    espControllerEvents = {
      'serialport:list': (ports) => {
        log.debug('Received a list of serial ports:', ports);

        this.stopLoading();

        this.setState(state => ({
          ports: ports,
        }));

        ports.forEach((port) => {
          const { espPortManufacturer, espBaudrate } = this.state;
          if (port.manufacturer === espPortManufacturer) {
            this.setState(state => ({
              alertMessage: '',
              espPort: port,
            }));

            this.espOpenPort(port, {
              baudrate: espBaudrate
            });

            return;
          } else {
            this.setState(state => ({
              alertMessage: 'Rownd port not found', // TODO: Localization
              espPort: null
            }));
          }
        });
      },
      'serialport:change': (options) => {
        log.debug('serialport:change', options); // TODO: Port Değişikliği
      },
      'serialport:open': (options) => {
        log.debug('serialport:open', options);
        const { controllerType, port, baudrate, controllerState } = options;

        if (!this.state.espConnected) {
          this.connectPhoneBLEConnectionSocket();
          this.connectComputerConnectionSocket();
        }

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
        }));

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
    }

    componentWillUnmount() {
      this.removeEspControllerEvents();
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
        computerBaudrate: 115200,
        phoneBLEConnected: false,
        gamepadConnected: false,
        alertMessage: ''
      };
    }

    connectGamepadConnectionSocket() {
      // api.gamepadBLE.runProcess({})
      //   .then((res) => {
      //     console.log('calistiiiiiiii', res);
      //   })
      //   .catch((res) => {
      //   });


      this.gamepadBLEConnectionSocket && this.gamepadBLEConnectionSocket.disconnect();

      const token = store.get('session.token');
      const host = '';
      const options = {
        query: 'token=' + token,
        path: '/gamepad-socket.io'
      };
      this.gamepadBLEConnectionSocket = io.connect(host, options);

      this.gamepadBLEConnectionSocket.on('connect', () => {
        log.debug('Socket.IO Gamepad sunucusuna bağlantı kuruldu.');

        this.gamepadBLEConnectionSocket.emit('open', () => {});
      });

      this.gamepadBLEConnectionSocket.on('gamepad:bleconnected', (isConnected) => {
        if (isConnected) {
          this.gamepadConnection.start();
        } else {
          this.gamepadConnection.stop();
        }
      });

      this.gamepadConnection.on('gamepad:connect', (gamepad) => {
        this.setState(state => ({
          gamepadConnected: true
        }));
      });
      this.gamepadConnection.on('gamepad:disconnect', (gamepad) => {
        this.setState(state => ({
          gamepadConnected: false
        }));
        this.gamepadBLEConnectionSocket.emit('gamepad:removealldevices', () => {});
      });
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

        const espPort = this.state.ports[0];
        const computerPort = this.state.ports[1];
        const baudrate = this.state.computerBaudrate;

        this.computerConnectionSocket.emit('open', espPort, computerPort, baudrate, (connection) => {
          log.debug('open', JSON.stringify(espPort), JSON.stringify(computerPort), connection);
          this.setState(state => ({
            computerConnected: true
          }));
        });
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

        const espPort = this.state.ports[0];

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
      const delay = 5 * 1000; // wait for 5 seconds

      this.setState(state => ({
        loading: true
      }));
      this._loadingTimer = setTimeout(() => {
        this.setState(state => ({
          loading: false
        }));
      }, delay);
    }

    stopLoading() {
      if (this._loadingTimer) {
        clearTimeout(this._loadingTimer);
        this._loadingTimer = null;
      }
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
            espConnected: false
          }));

          log.error(err);
          return;
        }
      });
    }

    espClosePort(port = this.state.espPort) {
      this.setState(state => ({
        espConnecting: false,
        espConnected: false
      }));
      espController.closePort(port, (err) => {
        if (err) {
          log.error(err);
          return;
        }

        // Refresh ports
        espController.listPorts();
      });
    }

    render() {
      const { espConnected, alertMessage, espController, computerConnected, phoneBLEConnected, gamepadConnected } = this.state;
      const activeState = _.get(espController.state, 'status.activeState');

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
          <ConnectedDevice
            className={styles.connectedDevice}
            deviceName={`ESP (${espController.type}) - ${grblStateText}`}
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
            onTapAction={() => {
              this.connectGamepadConnectionSocket();
            }}
          />
          <ConnectedDevice
            className={styles.connectedDevice}
            deviceName="Computer"
            isConnected={computerConnected}
            infoText="*For connect to computer please use your computer"
            isManualConnectable={false}
            onTapAction={() => {}}
          />
        </div>
      );
    }
}

export default DeviceConnections;
