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
  AXIS_Y,
  AXIS_Z,
  WORKFLOW_STATE_RUNNING,
  LASER_DEVICE_MODE,
  FOUR_AXIS_DEVICE_MODE
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
      }
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
        axes: ['x', 'y', 'z'],
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
      const mposYAsix = state.machinePosition[AXIS_Y] || '0.000';
      const mposZAsix = state.machinePosition[AXIS_Z] || '0.000';
      const wposXAsix = state.workPosition[AXIS_X] || '0.000';
      const wposYAsix = state.workPosition[AXIS_Y] || '0.000';
      const wposZAxis = state.workPosition[AXIS_Z] || '0.000';

      const canClickX = state.canClick && includes(axes, 'x');
      const canClickZ = state.canClick && includes(axes, 'z');
      const canClickY = state.canClick && includes(axes, 'y');
      const canClickXYZ = canClickX && canClickY && canClickZ;
      const canClickXZ = canClickX && canClickZ;

      return (
        <div className={styles.deviceAxesWidget}>
          <div className={styles.axePositions}>
            <DeviceAxePositon
              name="X"
              machinePosition={mposXAsix}
              workPosition={wposXAsix}
            />
            { (deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE) &&
            (
              <DeviceAxePositon
                name="Y"
                machinePosition={mposYAsix}
                workPosition={wposYAsix}
              />
            ) }
            <DeviceAxePositon
              name="Z"
              machinePosition={mposZAsix}
              workPosition={wposZAxis}
            />
          </div>

          <div className={styles.axePositionsReset}>
            <RowndButton
              title={(deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE)
                ? 'Go XYZ'
                : 'Go XZ'}
              type="primary"
              disabled={(deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE)
                ? !canClickXYZ
                : !canClickXZ
              }
              onClick={() => ((deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE)
                ? this.move({ X: 0, Y: 0, Z: 0 })
                : this.move({ X: 0, Z: 0 }))}
            />
            <RowndButton
              title="Go X0" type="primary"
              disabled={!canClickX}
              onClick={() => this.move({ X: 0 })}
            />
            { (deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE) && (
              <RowndButton
                title="Go Y0" type="primary"
                disabled={!canClickY}
                onClick={() => this.move({ Y: 0 })}
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
              title="Sleep"
              type="primary"
              onClick={() => espController.command('sleep')}
            />
            <RowndButton
              title="Unlock"
              type="primary"
              onClick={() => espController.command('unlock')}
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
