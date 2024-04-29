import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import ExpressionEvaluator from 'expr-eval';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import chainedFunction from 'chained-function';
import get from 'lodash/get';
import portal from 'app/lib/portal';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';
import controller from 'app/lib/controller';
import pick from 'lodash/pick';
import includes from 'lodash/includes';
import pubsub from 'pubsub-js';
import Notifications from './Notifications';
import styles from './index.styl';
import LinearProgressBar from '../components/LinearProgressBar';
import loadIcon from './images/load-icon.svg';
import RowndButton from '../components/RowndButton';
import {
  METRIC_UNITS,
  // Grbl
  GRBL,
  // Workflow
  WORKFLOW_STATE_RUNNING,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_IDLE,
  GRBL_ACTIVE_STATE_ALARM
} from '../../constants';
import {
  NOTIFICATION_PROGRAM_ERROR,
  NOTIFICATION_M0_PROGRAM_PAUSE,
  NOTIFICATION_M1_PROGRAM_PAUSE,
  NOTIFICATION_M2_PROGRAM_END,
  NOTIFICATION_M30_PROGRAM_END,
  NOTIFICATION_M6_TOOL_CHANGE,
  NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE,
  NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE
} from './constants';
import Loading from './Loading';
import GCodeStats from '../GCodeStats';

const translateExpression = (function() {
  const { Parser } = ExpressionEvaluator;
  const reExpressionContext = new RegExp(/\[[^\]]+\]/g);

  return function (gcode, context = controller.context) {
    if (typeof gcode !== 'string') {
      log.error(`Invalid parameter: gcode=${gcode}`);
      return '';
    }

    const lines = gcode.split('\n');

    // The work position (i.e. posx, posy, posz) are not included in the context
    context = {
      ...controller.context,
      ...context
    };

    return lines.map(line => {
      try {
        line = line.replace(reExpressionContext, (match) => {
          const expr = match.slice(1, -1);
          return Parser.evaluate(expr, context);
        });
      } catch (e) {
        // Bypass unknown expression
      }

      return line;
    }).join('\n');
  };
}());

class LoadFile extends PureComponent {
    static propTypes = {
      isProcessing: PropTypes.bool,
      receivedChunks: PropTypes.number,
      expectedChunks: PropTypes.number,
      onFileSelect: PropTypes.func,
      filePath: PropTypes.string,
      openFileDialog: PropTypes.func
    };

    state = this.getInitialState();

    actions = {
      dismissNotification: () => {
        this.setState((state) => ({
          notification: {
            ...state.notification,
            type: '',
            data: ''
          }
        }));
      },
      uploadFile: (gcode, meta) => {
        const { name } = { ...meta };
        const context = {};

        this.setState((state) => ({
          gcode: {
            ...state.gcode,
            loading: true,
            rendering: false,
            ready: false
          }
        }));

        controller.command('gcode:load', name, gcode, context, (err, data) => {
          if (err) {
            this.setState((state) => ({
              gcode: {
                ...state.gcode,
                loading: false,
                rendering: false,
                ready: false
              }
            }));

            log.error(err);
            return;
          }

          log.debug(data); // TODO
        });
      },
      loadGCode: (name, gcode) => {
        const capable = {
          view3D: !!this.visualizer
        };

        const updater = (state) => ({
          gcode: {
            ...state.gcode,
            loading: false,
            rendering: capable.view3D,
            ready: !capable.view3D,
            content: gcode,
            bbox: {
              min: {
                x: 0,
                y: 0,
                z: 0
              },
              max: {
                x: 0,
                y: 0,
                z: 0
              }
            }
          }
        });
        const callback = () => {
          // Clear gcode bounding box
          controller.context = {
            ...controller.context,
            xmin: 0,
            xmax: 0,
            ymin: 0,
            ymax: 0,
            zmin: 0,
            zmax: 0
          };

          // if (!capable.view3D) {
          //   return;
          // }

          setTimeout(() => {
            this.visualizer.load(name, gcode, ({ bbox }) => {
              // Set gcode bounding box
              controller.context = {
                ...controller.context,
                xmin: bbox.min.x,
                xmax: bbox.max.x,
                ymin: bbox.min.y,
                ymax: bbox.max.y,
                zmin: bbox.min.z,
                zmax: bbox.max.z
              };

              pubsub.publish('gcode:bbox', bbox);

              this.setState((state) => ({
                gcode: {
                  ...state.gcode,
                  loading: false,
                  rendering: false,
                  ready: true,
                  bbox: bbox
                }
              }));
            });
          }, 0);
        };

        this.setState(updater, callback);
      },
      unloadGCode: () => {
        const visualizer = this.visualizer;
        if (visualizer) {
          visualizer.unload();
        }

        // Clear gcode bounding box
        controller.context = {
          ...controller.context,
          xmin: 0,
          xmax: 0,
          ymin: 0,
          ymax: 0,
          zmin: 0,
          zmax: 0
        };

        this.setState((state) => ({
          gcode: {
            ...state.gcode,
            loading: false,
            rendering: false,
            ready: false,
            content: '',
            bbox: {
              min: {
                x: 0,
                y: 0,
                z: 0
              },
              max: {
                x: 0,
                y: 0,
                z: 0
              }
            }
          }
        }));
      },
      handleRun: () => {
        const { workflow } = this.state;
        console.assert(includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state));

        if (workflow.state === WORKFLOW_STATE_IDLE) {
          this.actions.openGCodeStatsWidgetModal();
          controller.command('gcode:start');
          return;
        }

        if (workflow.state === WORKFLOW_STATE_PAUSED) {
          const { notification } = this.state;

          // M6 Tool Change
          if (notification.type === NOTIFICATION_M6_TOOL_CHANGE) {
            portal(({ onClose }) => (
              <Modal disableOverlay size="xs" onClose={onClose}>
                <Modal.Header>
                  <Modal.Title>
                    {i18n._('Tool Change')}
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {i18n._('Are you sure you want to resume program execution?')}
                </Modal.Body>
                <Modal.Footer>
                  <Button onClick={onClose}>
                    {i18n._('No')}
                  </Button>
                  <Button
                    btnStyle="primary"
                    onClick={chainedFunction(
                      () => {
                        controller.command('gcode:resume');
                      },
                      onClose
                    )}
                  >
                    {i18n._('Yes')}
                  </Button>
                </Modal.Footer>
              </Modal>
            ));

            return;
          }

          controller.command('gcode:resume');
          this.actions.openGCodeStatsWidgetModal();
        }
      },
      openGCodeStatsWidgetModal: () => {
        portal(({ onClose }) => (
          <Modal size="lg" onClose={onClose}>
            <Modal.Header>
              <Modal.Title>
                G-Code Stats
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <GCodeStats />
            </Modal.Body>
          </Modal>
        ));
      },
      handlePause: () => {
        const { workflow } = this.state;
        console.assert(includes([WORKFLOW_STATE_RUNNING], workflow.state));

        controller.command('gcode:pause');
      },
      handleStop: () => {
        const { workflow } = this.state;
        console.assert(includes([WORKFLOW_STATE_PAUSED], workflow.state));

        controller.command('gcode:stop', { force: true });
      },
      handleClose: () => {
        const { workflow } = this.state;
        console.assert(includes([WORKFLOW_STATE_IDLE], workflow.state));

        controller.command('gcode:unload');

        pubsub.publish('gcode:unload'); // Unload the G-code
      },
    }

    controllerEvents = {
      'serialport:open': (options) => {
        const { port } = options;
        this.setState((state) => ({ port: port }));
      },
      'serialport:close': (options) => {
        this.actions.unloadGCode();

        const initialState = this.getInitialState();
        this.setState((state) => ({ ...initialState }));
      },
      'gcode:load': (name, gcode, context) => {
        gcode = translateExpression(gcode, context); // e.g. xmin,xmax,ymin,ymax,zmin,zmax
        this.actions.loadGCode(name, gcode);
      },
      'gcode:unload': () => {
        this.actions.unloadGCode();
      },
      'sender:status': (data) => {
        const { hold, holdReason, name, size, total, sent, received } = data;
        const notification = {
          type: '',
          data: ''
        };

        if (hold) {
          const { err, data, msg } = { ...holdReason };

          if (err) {
            notification.type = NOTIFICATION_PROGRAM_ERROR;
            notification.data = msg;
          } else if (data === 'M0') {
            // M0 Program Pause
            notification.type = NOTIFICATION_M0_PROGRAM_PAUSE;
            notification.data = msg;
          } else if (data === 'M1') {
            // M1 Program Pause
            notification.type = NOTIFICATION_M1_PROGRAM_PAUSE;
            notification.data = msg;
          } else if (data === 'M2') {
            // M2 Program End
            notification.type = NOTIFICATION_M2_PROGRAM_END;
            notification.data = msg;
          } else if (data === 'M30') {
            // M30 Program End
            notification.type = NOTIFICATION_M30_PROGRAM_END;
            notification.data = msg;
          } else if (data === 'M6') {
            // M6 Tool Change
            notification.type = NOTIFICATION_M6_TOOL_CHANGE;
            notification.data = msg;
          } else if (data === 'M109') {
            // M109 Set Extruder Temperature
            notification.type = NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE;
            notification.data = msg;
          } else if (data === 'M190') {
            // M190 Set Heated Bed Temperature
            notification.type = NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE;
            notification.data = msg;
          }
        }

        this.setState(state => ({
          gcode: {
            ...state.gcode,
            name,
            size,
            total,
            sent,
            received
          },
          notification: {
            ...state.notification,
            ...notification
          }
        }));
      },
      'workflow:state': (workflowState) => {
        this.setState(state => ({
          workflow: {
            ...state.workflow,
            state: workflowState
          }
        }));
      },
      'controller:settings': (type, controllerSettings) => {
        this.setState(state => ({
          controller: {
            ...state.controller,
            type: type,
            settings: controllerSettings
          }
        }));
      },
      'controller:state': (type, controllerState) => {
        // Grbl
        if (type === GRBL) {
          this.setState(state => ({
            controller: {
              ...state.controller,
              type: type,
              state: controllerState
            },
          }));
        }
      }
    }

    pubsubTokens = [];

    widgetContent = null;

    visualizer = null;

    componentDidMount() {
      this.addControllerEvents();
    }

    componentWillUnmount() {
      this.removeControllerEvents();
    }

    getInitialState() {
      return {
        port: controller.port,
        units: METRIC_UNITS,
        controller: {
          type: controller.type,
          settings: controller.settings,
          state: controller.state
        },
        workflow: {
          state: controller.workflow.state
        },
        notification: {
          type: '',
          data: ''
        },
        modal: {
          name: '',
          params: {}
        },
        machinePosition: { // Machine position
          x: '0.000',
          y: '0.000',
          z: '0.000'
        },
        workPosition: { // Work position
          x: '0.000',
          y: '0.000',
          z: '0.000'
        },
        gcode: {
          loading: false,
          rendering: false,
          ready: false,
          content: '',
          bbox: {
            min: {
              x: 0,
              y: 0,
              z: 0
            },
            max: {
              x: 0,
              y: 0,
              z: 0
            }
          },
          // Updates by the "sender:status" event
          name: '',
          size: 0,
          total: 0,
          sent: 0,
          received: 0
        },
      };
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

    fileInputEl = null;

    handleClickUpload = (event) => {
      this.fileInputEl.value = null;
      this.fileInputEl.click();
    };

    handleChangeFile = (event) => {
      const files = event.target.files;
      const file = files[0];
      const reader = new FileReader();

      reader.onloadend = (event) => {
        const { result, error } = event.target;

        if (error) {
          log.error(error);
          return;
        }

        log.debug('FileReader:', pick(file, [
          'lastModified',
          'lastModifiedDate',
          'meta',
          'name',
          'size',
          'type'
        ]));

        const meta = {
          name: file.name,
          size: file.size
        };
        this.actions.uploadFile(result, meta);
      };

      try {
        reader.readAsText(file);
      } catch (err) {
        // Ignore error
      }
    };

    canRun() {
      const { port, gcode, workflow, controller } = this.state;
      const controllerType = controller.type;
      const controllerState = controller.state;

      if (!port) {
        return false;
      }
      if (!gcode.ready) {
        return false;
      }
      if (!includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state)) {
        return false;
      }
      if (controllerType === GRBL) {
        const activeState = get(controllerState, 'status.activeState');
        const states = [
          GRBL_ACTIVE_STATE_ALARM
        ];
        if (includes(states, activeState)) {
          return false;
        }
      }

      return true;
    }

    render() {
      const { gcode, notification, port, workflow } = this.state;

      //const showLoader = gcode.loading || gcode.rendering;
      const showNotifications = !!notification.type;
      const canClick = !!port;
      const isReady = canClick && gcode.ready;
      const canRun = this.canRun();
      const canPause = isReady && includes([WORKFLOW_STATE_RUNNING], workflow.state);
      const canStop = isReady && includes([WORKFLOW_STATE_PAUSED], workflow.state);
      const canClose = isReady && includes([WORKFLOW_STATE_IDLE], workflow.state);
      const canUpload = isReady ? canClose : (canClick && !gcode.loading);

      return (
        <div className={styles.loadFileWidget}>
          {showNotifications && (
            <Notifications
              show={showNotifications}
              type={notification.type}
              data={notification.data}
              onDismiss={this.actions.dismissNotification}
            />
          )}
          <input
            // The ref attribute adds a reference to the component to
            // this.refs when the component is mounted.
            ref={(node) => {
              this.fileInputEl = node;
            }}
            type="file"
            style={{ display: 'none' }}
            multiple={false}
            onChange={this.handleChangeFile}
          />
          {
            !isReady && <span className={styles.loadFileTitle}>Select a CAM file to process</span>
          }
          {isReady && (
            <div className={styles.loadFileReady}>
              <span className={styles.runFilePath}>{gcode.name}</span>
              <LinearProgressBar
                value={gcode.sent}
                max={gcode.total}
              />
            </div>
          )}
          {gcode.loading &&
          <Loading />
          }
          <div className={styles.workflowControlButtons}>
            {canUpload && (
              <RowndButton
                title="Load File"
                type="secondary"
                icon={loadIcon}
                onClick={this.handleClickUpload}
                disabled={!canUpload}
              />
            )}
            { canRun && (
              <RowndButton
                title={workflow.state === WORKFLOW_STATE_PAUSED ? i18n._('Resume') : i18n._('Run')}
                type="primary"
                onClick={this.actions.handleRun}
                disabled={!canRun}
              />
            ) }
            {canPause && (
              <RowndButton
                type="primary"
                title={i18n._('Pause')}
                onClick={this.actions.handlePause}
                disabled={!canPause}
              />
            )}
            {canStop && (
              <RowndButton
                type="primary"
                title={i18n._('Stop')}
                onClick={this.actions.handleStop}
                disabled={!canStop}
              />
            )}
            {canClose && (
              <RowndButton
                type="primary"
                title={i18n._('Close')}
                onClick={this.actions.handleClose}
                disabled={!canClose}
              />
            )}
          </div>
        </div>
      );
    }
}

export default LoadFile;
