import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { in2mm, mapPositionToUnits } from 'app/lib/units';
import includes from 'lodash/includes';
import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import espController from 'app/lib/controller';
import styles from './index.styl';
import DeviceAxePositon from './DeviceAxePositon';
import RowndButton from '../components/RowndButton';
import {
  METRIC_UNITS,
  GRBL,
  GRBL_ACTIVE_STATE_IDLE,
  GRBL_ACTIVE_STATE_RUN,
  AXIS_X,
  AXIS_Z,
  WORKFLOW_STATE_RUNNING,
  LASER_DEVICE_MODE,
  FOUR_AXIS_DEVICE_MODE,
  AXIS_C,
  GAMEPAD_BUTTONS
} from '../../constants';
import homeIcon from './images/home-outline.svg';

class DeviceAxes extends PureComponent {
    static propTypes = {
      deviceMode: PropTypes.string
    };

    state = this.getInitialState();

    controllerEvents = {
      'serialport:open': (options) => {
        const { port } = options;
        this.setState({ port: port });
      },
      'workflow:state': (type, workflowState) => {
        this.setState(state => ({
          workflow: {
            ...state.workflow,
            state: workflowState
          }
        }));
      },
      'controller:state': (type, controllerState) => {
        if (type === GRBL) {
          const { status } = { ...controllerState };
          const { mpos, wpos } = status;
          const $13 = Number(get(espController.settings, 'settings.$13', 0)) || 0;

          this.setState(state => ({
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
      },
      'gamepad:button-action': (buttonName, value) => {
        switch (buttonName) {
        case GAMEPAD_BUTTONS.SQUARE:
          espController.command('homing');
          break;
        case GAMEPAD_BUTTONS.CROSS:
          ((this.props.deviceMode === FOUR_AXIS_DEVICE_MODE || this.props.deviceMode === LASER_DEVICE_MODE)
            ? this.move({ X: 0, C: 0, Z: 0 })
            : this.move({ X: 0, Z: 0 }));
          break;
        default: break;
        }
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
        canClick: true,
        port: espController.port,
        units: METRIC_UNITS,
        workflow: {
          state: espController.workflow.state
        },
        controller: {
          type: espController.type,
          state: espController.state
        },
        axes: ['x', 'c', 'z'],
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

    move(params = {}) {
      const s = map(params, (value, letter) => ('' + letter.toUpperCase() + value)).join(' ');
      espController.command('gcode', 'G0 ' + s);
    }

    canClick() {
      const { port, workflow } = this.state;
      const controllerType = this.state.controller.type;
      const controllerState = this.state.controller.state;

      if (!port) {
        return false;
      }
      if (workflow.state === WORKFLOW_STATE_RUNNING) {
        return false;
      }
      if (!includes([GRBL], controllerType)) {
        return false;
      }
      if (controllerType === GRBL) {
        const activeState = get(controllerState, 'status.activeState');
        const states = [
          GRBL_ACTIVE_STATE_IDLE,
          GRBL_ACTIVE_STATE_RUN
        ];
        if (!includes(states, activeState)) {
          return false;
        }
      }

      return true;
    }

    render() {
      const { units, machinePosition, workPosition, axes } = this.state;
      const { deviceMode } = this.props;
      const state = {
        ...this.state,
        // Determine if the motion button is clickable
        canClick: this.canClick(),
        // Output machine position with the display units
        machinePosition: mapValues(machinePosition, (pos, axis) => {
          return String(mapPositionToUnits(pos, units));
        }),
        // Output work position with the display units
        workPosition: mapValues(workPosition, (pos, axis) => {
          return String(mapPositionToUnits(pos, units));
        })
      };

      const mposXAsix = state.machinePosition[AXIS_X] || '0.000';
      const mposCAsix = state.machinePosition[AXIS_C] || '0.000';
      const mposZAsix = state.machinePosition[AXIS_Z] || '0.000';
      const wposXAsix = state.workPosition[AXIS_X] || '0.000';
      const wposCAsix = state.workPosition[AXIS_C] || '0.000';
      const wposZAxis = state.workPosition[AXIS_Z] || '0.000';

      const canClickX = state.canClick && includes(axes, 'x');
      const canClickZ = state.canClick && includes(axes, 'z');
      const canClickC = state.canClick && includes(axes, 'c');
      const canClickXCZ = canClickX && canClickC && canClickZ;
      const canClickXZ = canClickX && canClickZ;

      return (
        <div className={styles.deviceAxesWidget}>
          <div className={styles.axePositions}>
            <DeviceAxePositon
              label="ZERO"
              name="X"
              machinePosition={mposXAsix}
              workPosition={wposXAsix}
              onClick={() => espController.command('gcode', 'G10L20P1X0')}
            />
            { (deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE) &&
            (
              <DeviceAxePositon
                label="ZERO"
                name="C"
                machinePosition={mposCAsix}
                workPosition={wposCAsix}
                onClick={() => espController.command('gcode', 'G10L20P1C0')}
              />
            ) }
            <DeviceAxePositon
              label="ZERO"
              name="Z"
              machinePosition={mposZAsix}
              workPosition={wposZAxis}
              onClick={() => espController.command('gcode', 'G10L20P1Z0')}
            />
          </div>

          <div className={styles.axePositionsReset}>
            <RowndButton
              title={(deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE)
                ? 'Go XCZ'
                : 'Go XZ'}
              type="primary"
              disabled={(deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE)
                ? !canClickXCZ
                : !canClickXZ
              }
              onClick={() => ((deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE)
                ? this.move({ X: 0, C: 0, Z: 0 })
                : this.move({ X: 0, Z: 0 }))}
            />
            <RowndButton
              title="Go X0" type="primary"
              disabled={!canClickX}
              onClick={() => this.move({ X: 0 })}
            />
            { (deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE) && (
              <RowndButton
                title="Go C0" type="primary"
                disabled={!canClickC}
                onClick={() => this.move({ C: 0 })}
              />
            ) }
            <RowndButton
              title="Go Z0" type="primary"
              disabled={!canClickZ}
              onClick={() => this.move({ Z: 0 })}
            />
          </div>

          <div className={styles.positionsReset}>
            <RowndButton
              title="Home"
              type="primary"
              icon={homeIcon}
              onClick={() => espController.command('homing')}
            />
            <RowndButton
              title="Unlock"
              type="primary"
              onClick={() => espController.command('unlock')}
            />
            <RowndButton
              title="Cycle Start"
              type="primary"
              onClick={() => espController.command('cyclestart')}
            />
            <RowndButton
              title="Feedhold"
              type="primary"
              onClick={() => espController.command('feedhold')}
            />
            <RowndButton
              title="Reset"
              type="secondary"
              onClick={() => espController.command('reset')}
            />
          </div>

        </div>
      );
    }
}

export default DeviceAxes;
