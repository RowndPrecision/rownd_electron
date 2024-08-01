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
  WORKFLOW_STATE_RUNNING,
  FOUR_AXIS_DEVICE_MODE } from '../../constants';
import SliderInput from '../components/SliderInput';

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
        const { spindle } = state.status;
        if (type === GRBL) {
          this.setState({
            spindleSpeed: spindle,
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
      espController.command('gcode', 'M5');
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

    handleSpindleSpeedChange(value, isClockwise, isRunning) {
      const spindleSpeed = Number(value) || 0;

      this.setState({ spindleSpeed: spindleSpeed }, () => {
        if (value === 0) {
          espController.command('gcode', 'M5');
        } else if (isRunning) {
          espController.command('gcode', isClockwise ? 'M3 S' + spindleSpeed : 'M4 S' + spindleSpeed);
        }
      });
    }

    handleLaserSliderInput(value) {
      if (value > 0) {
        const power = value * 10;
        const duration = 0;
        const maxS = 1000;
        espController.command('lasertest:on', power, duration, maxS);
      } else {
        espController.command('lasertest:off');
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
          {
            (deviceMode === LASER_DEVICE_MODE)
              ? (
                <SliderInput
                  min={0} max={100} cur={0}
                  disabled={!state.canClick} onChange={(value) => this.handleLaserSliderInput(value)}
                />
              )
              : (
                <Speedometer
                  min={0}
                  max={(deviceMode === FOUR_AXIS_DEVICE_MODE) ? 12000 : 3000}
                  cur={state.spindleSpeed}
                  step={10}
                  unitName="RPM"
                  disabled={!state.canClick}
                  onStart={(isClockwise) => this.handleSpindleSpeedChange(state.spindleSpeed, isClockwise, true)}
                  onStop={() => this.handleSpindleSpeedChange(0, false, false)}
                  onChange={(value, isClockwise, isRunning) => {
                    this.handleSpindleSpeedChange(value, isClockwise, isRunning);
                  }}
                />
              )
          }
          <JogController deviceMode={deviceMode} />
        </div>
      );
    }
}

export default DeviceController;
