import _ from 'lodash';
import classNames from 'classnames';
import Dropzone from 'react-dropzone';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import { withRouter } from 'react-router-dom';
import api from 'app/api';
import {
  WORKFLOW_STATE_IDLE,
  DEVICE_MODES
} from 'app/constants';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import FeederPaused from './modals/FeederPaused';
import FeederWait from './modals/FeederWait';
import ServerDisconnected from './modals/ServerDisconnected';
import styles from './index.styl';
import {
  MODAL_NONE,
  MODAL_FEEDER_PAUSED,
  MODAL_FEEDER_WAIT,
  MODAL_SERVER_DISCONNECTED,
} from './constants';
import DeviceConnections from '../../widgets/DeviceConnections';
import DeviceModeSelection from '../../widgets/DeviceModeSelection';
import DeviceAxes from '../../widgets/DeviceAxes';
import DeviceController from '../../widgets/DeviceController';
import LoadFile from '../../widgets/LoadFile';

const WAIT = '%wait';

const startWaiting = () => {
  // Adds the 'wait' class to <html>
  const root = document.documentElement;
  root.classList.add('wait');
};
const stopWaiting = () => {
  // Adds the 'wait' class to <html>
  const root = document.documentElement;
  root.classList.remove('wait');
};

class Workspace extends PureComponent {
    static propTypes = {
      ...withRouter.propTypes
    };

    state = {
      mounted: false,
      port: '',
      modal: {
        name: MODAL_NONE,
        params: {}
      },
      isDraggingFile: false,
      isUploading: false,
      selectedDeviceMode: DEVICE_MODES[0],
      gcodeFile: null
    };

    action = {
      openModal: (name = MODAL_NONE, params = {}) => {
        this.setState(state => ({
          modal: {
            name: name,
            params: params
          }
        }));
      },
      closeModal: () => {
        this.setState(state => ({
          modal: {
            name: MODAL_NONE,
            params: {}
          }
        }));
      },
      updateModalParams: (params = {}) => {
        this.setState(state => ({
          modal: {
            ...state.modal,
            params: {
              ...state.modal.params,
              ...params
            }
          }
        }));
      }
    };

    defaultContainer = null;

    controllerEvents = {
      'connect': () => {
        if (controller.connected) {
          this.action.closeModal();
        } else {
          this.action.openModal(MODAL_SERVER_DISCONNECTED);
        }
      },
      'connect_error': () => {
        if (controller.connected) {
          this.action.closeModal();
        } else {
          this.action.openModal(MODAL_SERVER_DISCONNECTED);
        }
      },
      'disconnect': () => {
        if (controller.connected) {
          this.action.closeModal();
        } else {
          this.action.openModal(MODAL_SERVER_DISCONNECTED);
        }
      },
      'serialport:read': (data) => {
        if (data.includes('$37')) {
          let match = data.split('=');
          if (match && match[1]) {
            let value = match[1].trim();
            this.setState({ selectedDeviceMode: value });
          }
        }
      },
      'serialport:open': (options) => {
        const { port } = options;
        this.setState({ port: port });
      },
      'serialport:close': (options) => {
        this.setState({ port: '' });
      },
      'feeder:status': (status) => {
        const { modal } = this.state;
        const { hold, holdReason } = { ...status };

        if (!hold) {
          if (_.includes([MODAL_FEEDER_PAUSED, MODAL_FEEDER_WAIT], modal.name)) {
            this.action.closeModal();
          }
          return;
        }

        const { err, data, msg } = { ...holdReason };

        if (err) {
          this.action.openModal(MODAL_FEEDER_PAUSED, {
            title: i18n._('Error'),
            message: msg,
          });
          return;
        }

        if (data === WAIT) {
          this.action.openModal(MODAL_FEEDER_WAIT, {
            title: '%wait',
            message: msg,
          });
          return;
        }

        const title = {
          'M0': i18n._('M0 Program Pause'),
          'M1': i18n._('M1 Program Pause'),
          'M2': i18n._('M2 Program End'),
          'M30': i18n._('M30 Program End'),
          'M6': i18n._('M6 Tool Change'),
          'M109': i18n._('M109 Set Extruder Temperature'),
          'M190': i18n._('M190 Set Heated Bed Temperature')
        }[data] || data;

        this.action.openModal(MODAL_FEEDER_PAUSED, {
          title: title,
          message: msg,
        });
      }
    };

    onDrop = (files) => {
      const { port } = this.state;

      if (!port) {
        return;
      }

      let file = files[0];
      let reader = new FileReader();

      reader.onloadend = (event) => {
        const { result, error } = event.target;

        if (error) {
          log.error(error);
          return;
        }

        log.debug('FileReader:', _.pick(file, [
          'lastModified',
          'lastModifiedDate',
          'meta',
          'name',
          'size',
          'type'
        ]));

        startWaiting();
        this.setState({ isUploading: true });

        const name = file.name;
        const gcode = result;

        api.loadGCode({ port, name, gcode })
          .then((res) => {
            const { name = '', gcode = '' } = { ...res.body };
            pubsub.publish('gcode:load', { name, gcode });
          })
          .catch((res) => {
            log.error('Failed to upload G-code file');
          })
          .then(() => {
            stopWaiting();
            this.setState({ isUploading: false });
          });
      };

      try {
        reader.readAsText(file);
      } catch (err) {
        // Ignore error
      }
    };

    componentDidMount() {
      this.addControllerEvents();

      setTimeout(() => {
        // A workaround solution to trigger componentDidUpdate on initial render
        this.setState({ mounted: true });
      }, 0);


      setTimeout(() => {
        // Device Current Mode
        controller.command('gcode', '$37');
      }, 500);
    }

    componentWillUnmount() {
      this.removeControllerEvents();
    }

    componentDidUpdate() {
    }

    addControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        controller.addListener(eventName, callback);
      });
    }

    removeControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        controller.removeListener(eventName, callback);
      });
    }

    render() {
      const { style, className } = this.props;
      const {
        port,
        modal,
        isDraggingFile,
        selectedDeviceMode
      } = this.state;

      return (
        <div style={style} className={classNames(className, styles.workspace)}>
          {modal.name === MODAL_FEEDER_PAUSED && (
            <FeederPaused
              title={modal.params.title}
              message={modal.params.message}
              onClose={this.action.closeModal}
            />
          )}
          {modal.name === MODAL_FEEDER_WAIT && (
            <FeederWait
              title={modal.params.title}
              message={modal.params.message}
              onClose={this.action.closeModal}
            />
          )}
          {modal.name === MODAL_SERVER_DISCONNECTED &&
            <ServerDisconnected />
          }
          <div
            className={classNames(
              styles.dropzoneOverlay,
              { [styles.hidden]: !(port && isDraggingFile) }
            )}
          >
            <div className={styles.textBlock}>
              {i18n._('Drop G-code file here')}
            </div>
          </div>
          <Dropzone
            className={styles.dropzone}
            disabled={controller.workflow.state !== WORKFLOW_STATE_IDLE}
            disableClick={true}
            disablePreview={true}
            multiple={false}
            onDragStart={(event) => {
            }}
            onDragEnter={(event) => {
              if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                return;
              }
              if (!isDraggingFile) {
                this.setState({ isDraggingFile: true });
              }
            }}
            onDragLeave={(event) => {
              if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                return;
              }
              if (isDraggingFile) {
                this.setState({ isDraggingFile: false });
              }
            }}
            onDrop={(acceptedFiles, rejectedFiles) => {
              if (controller.workflow.state !== WORKFLOW_STATE_IDLE) {
                return;
              }
              if (isDraggingFile) {
                this.setState({ isDraggingFile: false });
              }
              this.onDrop(acceptedFiles);
            }}
          >
            <div className={styles.workspaceTable}>
              <div className={styles.workspaceTableRow}>
                <div
                  ref={node => {
                    this.defaultContainer = node;
                  }}
                  className={classNames(
                    styles.defaultContainer,
                  )}
                >
                  <DeviceConnections deviceMode={selectedDeviceMode} />
                  <DeviceModeSelection
                    modes={DEVICE_MODES}
                    selectedDeviceMode={selectedDeviceMode}
                    onChange={(mode) => this.setState(state => ({
                      selectedDeviceMode: mode
                    }), () => controller.command('gcode', '$37=' + mode))
                    }
                  />
                  <DeviceAxes deviceMode={selectedDeviceMode} />
                  <DeviceController deviceMode={selectedDeviceMode} />
                  <LoadFile deviceMode={selectedDeviceMode} />
                </div>
              </div>
            </div>
          </Dropzone>
        </div>
      );
    }
}

export default withRouter(Workspace);
