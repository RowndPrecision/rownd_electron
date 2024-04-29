import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
// import cx from 'classnames';
import includes from 'lodash/includes';
import get from 'lodash/get';
import espController from 'app/lib/controller';
import styles from './index.styl';
import Speedometer from './Speedometer';
import JogController from './JogController';
import { LASER_DEVICE_MODE,
  GRBL,
  GRBL_ACTIVE_STATE_IDLE,
  GRBL_ACTIVE_STATE_HOLD,
  WORKFLOW_STATE_RUNNING } from '../../constants';

class DeviceController extends PureComponent {
    static propTypes = {
      deviceMode: PropTypes.string
    };

    state = this.getInitialState();

    controllerEvents = {
      'serialport:open': (options) => {
        const { port } = options;
        this.setState({ port: port });
      },
      'serialport:close': (options) => {
        const initialState = this.getInitialState();
        this.setState({ ...initialState });
      },
      'workflow:state': (workflowState) => {
        this.setState(state => ({
          workflow: {
            state: workflowState
          }
        }));
      },
      'controller:state': (type, state) => {
        if (type === GRBL) {
          this.setState({
            controller: {
              type: type,
              state: state,
            }
          });
        }
      }
    }

    getInitialState() {
      return {
        canClick: true, // Defaults to true
        port: espController.port,
        controller: {
          type: espController.type,
          state: espController.state,
        },
        workflow: {
          state: espController.workflow.state
        },
        spindleSpeed: 0
      };
    }

    componentDidMount() {
      this.addControllerEvents();
    }

    componentWillUnmount() {
      this.removeControllerEvents();
    }

    componentDidUpdate(prevProps, prevState) {
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
          GRBL_ACTIVE_STATE_HOLD
        ];
        if (!includes(states, activeState)) {
          return false;
        }
      }

      return true;
    }

    handleSpindleSpeedChange(value) {
      const spindleSpeed = Number(value) || 0;
      this.setState({ spindleSpeed: spindleSpeed });

      if (spindleSpeed > 0) {
        espController.command('gcode', 'M3 S' + spindleSpeed);
      } else {
        espController.command('gcode', 'M3');
        espController.command('gcode', 'M5');
      }
    }

    render() {
      const { deviceMode } = this.props;
      const state = {
        ...this.state,
        canClick: this.canClick()
      };

      return (
        <div className={styles.deviceControllerWidget}>
          <Speedometer
            min={0}
            max={(deviceMode === LASER_DEVICE_MODE) ? 100 : 3000}
            step={(deviceMode === LASER_DEVICE_MODE) ? 1 : 10}
            unitName={(deviceMode === LASER_DEVICE_MODE) ? 'VOLT' : 'RPM'}
            disabled={!state.canClick}
            onChange={(value) => {
              if (!state.canClick) {
                return;
              }
              if (deviceMode === LASER_DEVICE_MODE) {
                console.log(value);
              } else {
                this.handleSpindleSpeedChange(value);
              }
            }}
          />
          <JogController deviceMode={deviceMode} />
        </div>
      );
    }
}

export default DeviceController;
