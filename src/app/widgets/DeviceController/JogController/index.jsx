import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import includes from 'lodash/includes';
import { limit } from 'app/lib/normalize-range';
import map from 'lodash/map';
import cx from 'classnames';
import get from 'lodash/get';
import espController from 'app/lib/controller';
import ensureArray from 'ensure-array';
import WidgetConfig from 'app/widgets/WidgetConfig';
import Repeatable from 'react-repeatable';
import styles from './index.styl';
import StepSizePicker from './StepSizePicker';
import northeastArrowIcon from './images/northeast-arrow-icon.svg';
import northwestArrowIcon from './images/northwest-arrow-icon.svg';
import southwestArrowIcon from './images/southwest-arrow-icon.svg';
import southeastArrowIcon from './images/southeast-arrow-icon.svg';
import {
  GRBL,
  GRBL_ACTIVE_STATE_IDLE,
  GRBL_ACTIVE_STATE_RUN,
  METRIC_UNITS,
  METRIC_STEPS,
  WORKFLOW_STATE_RUNNING,
  LASER_DEVICE_MODE,
  FOUR_AXIS_DEVICE_MODE
} from '../../../constants';

const FEED_RATES = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000];

class JogController extends PureComponent {
    static propTypes = {
      deviceMode: PropTypes.string
    };

    config = new WidgetConfig('AxesWidget');

    state = this.getInitialState();

    controllerEvents = {
      'serialport:open': (options) => {
        const { port } = options;
        this.setState({ port: port });
      },
      'workflow:state': (type, workflowState) => {
        const canJog = (workflowState !== WORKFLOW_STATE_RUNNING);

        this.setState(state => ({
          jog: {
            ...state.jog,
            axis: canJog ? state.jog.axis : '',
            keypad: canJog ? state.jog.keypad : false
          },
          workflow: {
            ...state.workflow,
            state: workflowState
          }
        }));
      },
      'controller:state': (type, controllerState) => {
        this.setState(state => ({
          controller: {
            ...state.controller,
            type: type,
            state: controllerState
          },
        }));
      }
    }

    getInitialState() {
      return {
        canClick: true, // Defaults to true
        port: espController.port,
        units: METRIC_UNITS,
        controller: {
          type: espController.type,
          state: espController.state
        },
        workflow: {
          state: espController.workflow.state
        },
        axes: ['x', 'c', 'z'],
        feedRate: 100,
        jog: {
          axis: '', // Defaults to empty
          metric: {
            step: this.config.get('jog.metric.step'),
            distances: ensureArray(this.config.get('jog.metric.distances', []))
          }
        },
      };
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

    getJogDistance() {
      const { units } = this.state;

      if (units === METRIC_UNITS) {
        const step = this.config.get('jog.metric.step');
        const metricJogDistances = ensureArray(this.config.get('jog.metric.distances', []));
        const metricJogSteps = [
          ...metricJogDistances,
          ...METRIC_STEPS
        ];
        const distance = Number(metricJogSteps[step]) || 0;
        return distance;
      }

      return 0;
    }

    jog(params = {}) {
      const s = map(params, (value, letter) => ('' + letter.toUpperCase() + value)).join(' ');
      espController.command('gcode', 'G91'); // relative
      espController.command('gcode', 'G1 F' + this.state.feedRate + ' ' + s);
      espController.command('gcode', 'G90'); // absolute
    }

    selectStep(value = '') {
      const step = Number(value);
      this.setState(state => ({
        jog: {
          ...state.jog,
          metric: {
            ...state.jog.metric,
            step: (state.units === METRIC_UNITS) ? step : state.jog.metric.step
          }
        }
      }));
    }

    stepForward() {
      this.setState(state => {
        const metricJogSteps = [
          ...state.jog.metric.distances,
          ...METRIC_STEPS
        ];

        return {
          jog: {
            ...state.jog,
            metric: {
              ...state.jog.metric,
              step: (state.units === METRIC_UNITS)
                ? limit(state.jog.metric.step + 1, 0, metricJogSteps.length - 1)
                : state.jog.metric.step
            }
          }
        };
      });
    }

    stepBackward() {
      this.setState(state => {
        const metricJogSteps = [
          ...state.jog.metric.distances,
          ...METRIC_STEPS
        ];

        return {
          jog: {
            ...state.jog,
            metric: {
              ...state.jog.metric,
              step: (state.units === METRIC_UNITS)
                ? limit(state.jog.metric.step - 1, 0, metricJogSteps.length - 1)
                : state.jog.metric.step
            }
          }
        };
      });
    }

    feedRateStepBackward = () => {
      this.setState((prevState) => {
        const currentIndex = FEED_RATES.indexOf(prevState.feedRate);
        if (currentIndex > 0) {
          return { feedRate: FEED_RATES[currentIndex - 1] };
        }
        return null; // Değer aynı kalır
      });
    };

    feedRateStepForward = () => {
      this.setState((prevState) => {
        const currentIndex = FEED_RATES.indexOf(prevState.feedRate);
        if (currentIndex < FEED_RATES.length - 1) {
          return { feedRate: FEED_RATES[currentIndex + 1] };
        }
        return null; // Değer aynı kalır
      });
    };

    componentDidUpdate(prevProps, prevState) {
      const { units, jog } = this.state;

      if (units === METRIC_UNITS) {
        this.config.set('jog.metric.step', Number(jog.metric.step) || 0);
      }
    }

    componentDidMount() {
      this.addControllerEvents();
    }

    componentWillUnmount() {
      this.removeControllerEvents();
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

    render() {
      const { deviceMode } = this.props;
      const { units, axes, jog } = this.state;
      const metricJogDistances = ensureArray(jog.metric.distances);
      const metricJogSteps = [
        ...metricJogDistances,
        ...METRIC_STEPS
      ];
      const state = {
        ...this.state,
        // Determine if the motion button is clickable
        canClick: this.canClick(),
      };
      const canChangeStep = state.canClick;
      const canStepForward = canChangeStep && (
        (units === METRIC_UNITS && (jog.metric.step < metricJogSteps.length - 1))
      );
      const canStepBackward = canChangeStep && (
        (units === METRIC_UNITS && (jog.metric.step > 0))
      );
      const canClickX = state.canClick && includes(axes, 'x');
      const canClickZ = state.canClick && includes(axes, 'z');
      const canClickXZ = canClickX && canClickZ;
      const canClickC = state.canClick && includes(axes, 'c');

      return (
        <div className={styles.jogControllerContainer}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className={styles.jogController}>
              <Repeatable
                disabled={!canClickXZ}
                repeatDelay={1000}
                repeatInterval={state.feedRate}
                onHold={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: distance, Z: -distance });
                }}
                onPress={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: distance, Z: -distance });
                }}
              >
                <button
                  type="button"
                  id="northwest"
                  className={styles.jogButton}
                  disabled={!canClickXZ}
                  style={{ backgroundImage: `url(${northwestArrowIcon})` }}
                  aria-label="northwest"
                />
              </Repeatable>

              <Repeatable
                disabled={!canClickZ}
                repeatDelay={1000}
                repeatInterval={state.feedRate}
                onHold={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: distance });
                }}
                onPress={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: distance });
                }}
              >
                <button
                  type="button"
                  id="north"
                  className={cx(styles.jogButton, styles.mainAxe)}
                  disabled={!canClickZ}
                >
                X+
                </button>
              </Repeatable>

              <Repeatable
                disabled={!canClickXZ}
                repeatDelay={1000}
                repeatInterval={state.feedRate}
                onHold={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: distance, Z: distance });
                }}
                onPress={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: distance, Z: distance });
                }}
              >
                <button
                  type="button"
                  id="northeast"
                  className={styles.jogButton}
                  disabled={!canClickXZ}
                  style={{ backgroundImage: `url(${northeastArrowIcon})` }}
                  aria-label="northeast"
                />
              </Repeatable>

              <Repeatable
                disabled={!canClickX}
                repeatDelay={1000}
                repeatInterval={state.feedRate}
                onHold={() => {
                  const distance = this.getJogDistance();
                  this.jog({ Z: -distance });
                }}
                onPress={() => {
                  const distance = this.getJogDistance();
                  this.jog({ Z: -distance });
                }}
              >
                <button
                  type="button"
                  id="west"
                  className={cx(styles.jogButton, styles.mainAxe)}
                  disabled={!canClickX}
                >
                Z-
                </button>
              </Repeatable>

              <button
                type="button"
                id="center"
                className={cx(styles.jogButton, styles.center)}
                disabled={!canClickXZ}
              >
                    &nbsp;
              </button>

              <Repeatable
                disabled={!canClickX}
                repeatDelay={1000}
                repeatInterval={state.feedRate}
                onHold={() => {
                  const distance = this.getJogDistance();
                  this.jog({ Z: distance });
                }}
                onPress={() => {
                  const distance = this.getJogDistance();
                  this.jog({ Z: distance });
                }}
              >
                <button
                  type="button"
                  id="east"
                  className={cx(styles.jogButton, styles.mainAxe)}
                  disabled={!canClickX}
                >
                Z+
                </button>
              </Repeatable>

              <Repeatable
                disabled={!canClickXZ}
                repeatDelay={1000}
                repeatInterval={state.feedRate}
                onHold={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: -distance, Z: -distance });
                }}
                onPress={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: -distance, Z: -distance });
                }}
              >
                <button
                  type="button"
                  id="southwest"
                  className={styles.jogButton}
                  disabled={!canClickXZ}
                  style={{ backgroundImage: `url(${southwestArrowIcon})` }}
                  aria-label="southwest"
                />
              </Repeatable>

              <Repeatable
                disabled={!canClickZ}
                repeatDelay={1000}
                repeatInterval={state.feedRate}
                onHold={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: -distance });
                }}
                onPress={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: -distance });
                }}
              >
                <button
                  type="button"
                  id="south"
                  className={cx(styles.jogButton, styles.mainAxe)}
                  disabled={!canClickZ}
                >
                X-
                </button>
              </Repeatable>

              <Repeatable
                disabled={!canClickXZ}
                repeatDelay={1000}
                repeatInterval={state.feedRate}
                onHold={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: -distance, Z: distance });
                }}
                onPress={() => {
                  const distance = this.getJogDistance();
                  this.jog({ X: -distance, Z: distance });
                }}
              >
                <button
                  type="button"
                  id="southeast"
                  className={styles.jogButton}
                  disabled={!canClickXZ}
                  style={{ backgroundImage: `url(${southeastArrowIcon})` }}
                  aria-label="southeast"
                />
              </Repeatable>
            </div>
            { (deviceMode === FOUR_AXIS_DEVICE_MODE || deviceMode === LASER_DEVICE_MODE) && (
              <div className={styles.cAxeController}>
                <Repeatable
                  style={{ marginLeft: '7px' }}
                  disabled={!canClickC}
                  repeatDelay={1000}
                  repeatInterval={state.feedRate}
                  onHold={() => {
                    const distance = this.getJogDistance();
                    this.jog({ C: distance });
                  }}
                  onPress={() => {
                    const distance = this.getJogDistance();
                    this.jog({ C: distance });
                  }}
                >
                  <button
                    type="button"
                    className={styles.cAxeControllerButton}
                    disabled={!canClickC}
                  >
                  +
                  </button>
                </Repeatable>
                <span className={styles.cAxeName}>C</span>
                <Repeatable
                  style={{ marginLeft: '10px' }}
                  disabled={!canClickC}
                  repeatDelay={1000}
                  repeatInterval={state.feedRate}
                  onHold={() => {
                    const distance = this.getJogDistance();
                    this.jog({ C: -distance });
                  }}
                  onPress={() => {
                    const distance = this.getJogDistance();
                    this.jog({ C: -distance });
                  }}
                >
                  <button
                    type="button"
                    className={styles.cAxeControllerButton}
                    disabled={!canClickC}
                  >
                  -
                  </button>
                </Repeatable>
              </div>
            ) }
          </div>
          <StepSizePicker
            className={styles.stepSizePicker}
            canStepBackward={canStepBackward}
            canStepForward={canStepForward}
            onStepBackward={() => this.stepBackward()}
            onStepForward={() => this.stepForward()}
            unit="mm"
            value={metricJogSteps[jog.metric.step]}
          />
          <StepSizePicker
            className={styles.stepSizePicker}
            canStepBackward={canStepBackward}
            canStepForward={canStepForward}
            onStepBackward={() => this.feedRateStepBackward()}
            onStepForward={() => this.feedRateStepForward()}
            value={state.feedRate}
          />
        </div>
      );
    }
}

export default JogController;
