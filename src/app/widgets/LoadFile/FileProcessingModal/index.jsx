import React, { PureComponent } from 'react';
import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import pubsub from 'pubsub-js';
import moment from 'moment';
import get from 'lodash/get';
import { in2mm, mapPositionToUnits } from 'app/lib/units';
import mapValues from 'lodash/mapValues';
import espController from 'app/lib/controller';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';
import RowndButton from '../../components/RowndButton';
import DeviceAxePositon from '../../DeviceAxes/DeviceAxePositon';
import styles from './index.styl';
import Speedometer from '../../DeviceController/Speedometer';
import LinearProgressBar from '../../components/LinearProgressBar';
import {
  AXIS_X,
  AXIS_Z,
  AXIS_C,
  FOUR_AXIS_DEVICE_MODE,
  METRIC_UNITS,
  // Workflow
  WORKFLOW_STATE_RUNNING,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_IDLE,
  GRBL_ACTIVE_STATE_ALARM,
} from '../../../constants';

const formatISODateTime = (time) => {
  return time > 0 ? moment.unix(time / 1000).format('YYYY-MM-DD HH:mm:ss') : '–';
};

const formatElapsedTime = (elapsedTime) => {
  if (!elapsedTime || elapsedTime < 0) {
    return '–';
  }
  const d = moment.duration(elapsedTime, 'ms');
  return moment(d._data).format('HH:mm:ss');
};

const formatRemainingTime = (remainingTime) => {
  if (!remainingTime || remainingTime < 0) {
    return '–';
  }
  const d = moment.duration(remainingTime, 'ms');
  return moment(d._data).format('HH:mm:ss');
};

class FileProcessingModal extends PureComponent {
    static propTypes = {
      onClose: PropTypes.func,
      deviceMode: PropTypes.string
    };

    state = this.getInitialState();

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
      'sender:status': (data) => {
        const { total, sent, received, startTime, finishTime, elapsedTime, remainingTime } = data;

        this.setState({
          total,
          sent,
          received,
          startTime,
          finishTime,
          elapsedTime,
          remainingTime
        });
      },
      'workflow:state': (workflowState) => {
        this.setState(state => ({
          workflow: {
            ...state.workflow,
            state: workflowState
          }
        }));
      },
      'controller:state': (type, controllerState) => {
        const { status } = { ...controllerState };
        const { mpos, wpos, spindle } = status;
        const $13 = Number(get(espController.settings, 'settings.$13', 0)) || 0;

        this.setState(state => ({
          spindleSpeed: spindle,
          controller: {
            ...state.controller,
            type: type,
            state: controllerState
          },
          // Machine position are reported in mm ($13=0) or inches ($13=1)
          machinePosition: mapValues({
            ...state.machinePosition,
            ...mpos
          }, (val) => {
            return ($13 > 0) ? in2mm(val) : val;
          }),
          // Work position are reported in mm ($13=0) or inches ($13=1)
          workPosition: mapValues({
            ...state.workPosition,
            ...wpos
          }, val => {
            return ($13 > 0) ? in2mm(val) : val;
          })
        }));
      }
    }

      actions = {
        handleRun: () => {
          const { workflow } = this.state;
          console.assert(includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state));

          if (workflow.state === WORKFLOW_STATE_IDLE) {
            espController.command('gcode:start');
            return;
          }

          if (workflow.state === WORKFLOW_STATE_PAUSED) {
            espController.command('gcode:resume');
          }
        },
        handlePause: () => {
          const { workflow } = this.state;
          console.assert(includes([WORKFLOW_STATE_RUNNING], workflow.state));

          espController.command('gcode:pause');
        },
        handleStop: () => {
          const { workflow } = this.state;
          console.assert(includes([WORKFLOW_STATE_PAUSED], workflow.state));

          espController.command('gcode:stop', { force: true });
        },
        handleClose: () => {
          const { workflow } = this.state;
          console.assert(includes([WORKFLOW_STATE_IDLE], workflow.state));

          espController.command('gcode:unload');

          pubsub.publish('gcode:unload'); // Unload the G-code
        },
      }

      componentDidMount() {
        this.addControllerEvents();
      }

      componentWillUnmount() {
        this.removeControllerEvents();
      }

      getInitialState() {
        return {
          port: espController.port,
          units: METRIC_UNITS,
          controller: {
            type: espController.type,
            state: espController.state
          },
          workflow: {
            state: espController.workflow.state
          },
          machinePosition: { // Machine position
            x: '0.000',
            y: '0.000',
            z: '0.000',
            a: '0.000',
            b: '0.000',
            c: '0.000'
          },
          workPosition: { // Work position
            x: '0.000',
            y: '0.000',
            z: '0.000',
            a: '0.000',
            b: '0.000',
            c: '0.000'
          },
          spindleSpeed: 0,
          // G-code Status (from server)
          total: 0,
          sent: 0,
          received: 0,
          startTime: 0,
          finishTime: 0,
          elapsedTime: 0,
          remainingTime: 0,
        };
      }

      addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
          const callback = this.controllerEvents[eventName];
          espController.addListener(eventName, callback);
        });
      }

      removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
          const callback = this.controllerEvents[eventName];
          espController.removeListener(eventName, callback);
        });
      }

      canRun() {
        const { port, workflow, controller } = this.state;
        const controllerState = controller.state;

        if (!port) {
          return false;
        }
        if (!includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state)) {
          return false;
        }
        const activeState = get(controllerState, 'status.activeState');
        const states = [
          GRBL_ACTIVE_STATE_ALARM
        ];
        if (includes(states, activeState)) {
          return false;
        }

        return true;
      }

      render() {
        const { units, machinePosition, workPosition, workflow, port } = this.state;
        const { onClose, deviceMode } = this.props;
        const state = {
          ...this.state,
          // Output machine position with the display units
          machinePosition: mapValues(machinePosition, (pos, axis) => {
            return String(mapPositionToUnits(pos, units));
          }),
          // Output work position with the display units
          workPosition: mapValues(workPosition, (pos, axis) => {
            return String(mapPositionToUnits(pos, units));
          })
        };

        const canClick = !!port;
        const isReady = canClick;
        const canRun = this.canRun();
        const canPause = isReady && includes([WORKFLOW_STATE_RUNNING], workflow.state);
        const canStop = isReady && includes([WORKFLOW_STATE_PAUSED], workflow.state);
        const canClose = isReady && includes([WORKFLOW_STATE_IDLE], workflow.state);

        const startTime = formatISODateTime(state.startTime);
        const finishTime = formatISODateTime(state.finishTime);
        const elapsedTime = formatElapsedTime(state.elapsedTime);
        const remainingTime = formatRemainingTime(state.remainingTime);

        const mposXAsix = state.machinePosition[AXIS_X] || '0.000';
        const mposCAsix = state.machinePosition[AXIS_C] || '0.000';
        const mposZAsix = state.machinePosition[AXIS_Z] || '0.000';
        const wposXAsix = state.workPosition[AXIS_X] || '0.000';
        const wposCAsix = state.workPosition[AXIS_C] || '0.000';
        const wposZAxis = state.workPosition[AXIS_Z] || '0.000';

        return (
          <Modal showCloseButton={false}>
            <div className={styles.fileProcessingModal}>
              <div className={styles.fileProcessingModalHeader}>
                <div className={styles.fileProcessingModalHeaderText}>Processing</div>
              </div>
              <div className={styles.fileProcessingModalContent}>
                <div className={styles.fileProcessingModalContentAxePositions}>
                  <DeviceAxePositon
                    name="X"
                    label="POS"
                    machinePosition={mposXAsix}
                    workPosition={wposXAsix}
                  />
                  <DeviceAxePositon
                    name="C"
                    label="POS"
                    machinePosition={mposCAsix}
                    workPosition={wposCAsix}
                  />
                  <DeviceAxePositon
                    name="Z"
                    label="POS"
                    machinePosition={mposZAsix}
                    workPosition={wposZAxis}
                  />
                </div>
                <div className={styles.fileProcessingModalContentSpeedometer}>
                  <Speedometer
                    min={0}
                    max={(deviceMode === FOUR_AXIS_DEVICE_MODE) ? 12000 : 3000}
                    step={10}
                    unitName="RPM"
                    disabled={true}
                    cur={state.spindleSpeed}
                    onlyShowSpeedometer={true}
                  />
                </div>
              </div>
              <div className={styles.fileProcessingModalFooter}>
                <div className={styles.fileProcessingModalFooterGCodeStats}>
                  <div className={styles.fileProcessingModalFooterGCodeStatsTime}>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeLabel}>{i18n._('Sent')}</div>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeValue}>{state.total > 0 ? `${state.sent} / ${state.total}` : '–'}</div>
                  </div>


                  <div className={styles.fileProcessingModalFooterGCodeStatsTime}>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeLabel}>{i18n._('Received')}</div>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeValue}>{state.total > 0 ? `${state.received} / ${state.total}` : '–'}</div>
                  </div>

                  <div className={styles.fileProcessingModalFooterGCodeStatsTime}>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeLabel}>{i18n._('Start Time')}</div>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeValue}>{startTime}</div>
                  </div>


                  <div className={styles.fileProcessingModalFooterGCodeStatsTime}>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeLabel}>{i18n._('Elapsed Time')}</div>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeValue}>{elapsedTime}</div>
                  </div>

                  <div className={styles.fileProcessingModalFooterGCodeStatsTime}>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeLabel}>{i18n._('Finish Time')}</div>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeValue}>{finishTime}</div>
                  </div>

                  <div className={styles.fileProcessingModalFooterGCodeStatsTime}>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeLabel}>{i18n._('Remaining Time')}</div>
                    <div className={styles.fileProcessingModalFooterGCodeStatsTimeValue}>{remainingTime}</div>
                  </div>
                </div>
                <div className={styles.fileProcessingModalFooterActions}>
                  <div className={styles.fileProcessingModalFooterActionsProgressBar}>
                    <LinearProgressBar
                      value={state.sent}
                      max={state.total}
                    />
                    <p className={styles.fileProcessingModalFooterActionsProgressBarStatusText}>{workflow.state.toUpperCase()}</p>
                  </div>

                  <div className={styles.fileProcessingModalFooterActionsWorkflowControlButtons}>
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
                        onClick={() => {
                          this.actions.handleClose();
                          onClose();
                        }}
                        disabled={!canClose}
                      />
                    )}
                  </div>

                </div>
              </div>
            </div>
          </Modal>
        );
      }
}

export default FileProcessingModal;
