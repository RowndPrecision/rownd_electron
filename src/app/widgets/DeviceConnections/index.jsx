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

class DeviceConnections extends PureComponent {
    static propTypes = {
    };

    state = this.getInitialState();

    socket = null;

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
        console.log('serialport:change', options);
        log.debug('serialport:change', options); // TODO: Port Değişikliği
      },
      'serialport:open': (options) => {
        log.debug('serialport:open', options);
        console.log('serialport:open', options);
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
      //this.espRefreshPorts();

      this.socket && this.socket.destroy();
      const token = store.get('session.token');
      const host = '';
      const options = {
        query: 'token=' + token,
        path: '/computer-socket.io'
      };
      this.socket = io.connect(host, options);

      this.socket.on('connect', () => {
        console.log('Socket.IO sunucusuna bağlantı kuruldu.');
      });
    }

    componentWillUnmount() {
      this.removeEspControllerEvents();
      this.socket.disconnect();
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
        alertMessage: ''
      };
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
      const { espConnected, alertMessage, espController } = this.state;
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
            isConnected={false}
            infoText="*For connect to phone please use your phone"
            isManualConnectable
            onTapAction={() => {}}
          />
          <ConnectedDevice
            className={styles.connectedDevice}
            deviceName="Gamepad"
            isConnected={false}
            infoText="*For connect to phone please use your gamepad"
            isManualConnectable={true}
            onTapAction={() => {}}
          />
          <ConnectedDevice
            className={styles.connectedDevice}
            deviceName="Computer"
            isConnected={true}
            infoText="*For connect to computer please use your computer"
            isManualConnectable={true}
            onTapAction={() => {
              const espPort = this.state.ports[0];
              const computerPort = this.state.ports[1];

              this.socket.emit('open', espPort, computerPort, (connection) => {
                console.log('open', espPort, computerPort, connection);
              });

              this.socket.on('computer:data', (data, err, state) => {
                console.log('computer:data', data, err, state);
              });

              this.socket.on('computer:error', (err) => {
                console.log('computer:error', err);
              });

              this.socket.on('computer:close', (err) => {
                console.log('computer:close', err);
              });

              this.socket.on('computer-esp:data', (data) => {
                console.log('computer-esp:data', data);
              });
              // api.computer.connect(this.state.espPort)
              //   .then((res) => {
              //     const { data } = res.body;
              //     console.log(data);
              //   })
              //   .catch((res) => {
              //   });
            }}
          />
        </div>
      );
    }
}

export default DeviceConnections;