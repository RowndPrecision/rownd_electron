import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Repeatable from 'react-repeatable';
import espController from 'app/lib/controller';
import styles from './index.styl';
import { GAMEPAD_BUTTONS } from '../../../constants';

class LaserSliderInput extends PureComponent {
    static propTypes = {
      min: PropTypes.number,
      max: PropTypes.number,
      cur: PropTypes.number,
      onChange: PropTypes.func,
      disabled: PropTypes.bool
    };

    constructor(props) {
      super(props);
      this.state = {
        value: props.cur
      };
    }

    controllerEvents = {
      'gamepad:button-action': (buttonName, value) => {
        switch (buttonName) {
        case GAMEPAD_BUTTONS.TRIANGLE:
          this.handleChange(this.state.value + 1);
          break;
        case GAMEPAD_BUTTONS.CIRCLE:
          this.handleChange(0);
          break;
        case GAMEPAD_BUTTONS.SPEED_INCREASE:
          this.handleChange(this.state.value + 1);
          break;
        case GAMEPAD_BUTTONS.SPEED_DECREASE:
          this.handleChange(this.state.value - 1);
          break;
        default: break;
        }
      },
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

    componentWillUnmount() {
      this.removeControllerEvents();
    }

    componentDidMount() {
      this.addControllerEvents();

      const rangeElement = document.querySelector('.range input[type="range"]');
      if (rangeElement) {
        rangeElement.setAttribute('min', this.props.min);
        rangeElement.setAttribute('max', this.props.max);
        rangeElement.value = this.props.cur;
      }
    }

    generateBackground(value) {
      if (value === this.props.min) {
        return '';
      }

      let percentage = ((value - this.props.min) / (this.props.max - this.props.min)) * 100;
      return `linear-gradient(to right, #08F7FE, #9747FF ${percentage}%, #d9d9d9 ${percentage}%, #d9d9d9 100%)`;
    }

    handleChange(value) {
      if (value > this.props.max || value < this.props.min) {
        return;
      }

      this.setState({ value: Number(value) }, () => {
        this.props.onChange(value);
      });
    }

    render() {
      const { value } = this.state;
      const { min, max, disabled } = this.props;

      return (
        <div className={styles.rangeSlider}>
          <input
            type="range"
            disabled={disabled}
            step={1}
            min={min}
            max={max}
            value={value}
            onChange={(e) => this.handleChange(e.target.value)}
            style={{ background: this.generateBackground(value) }}
          />
          <div className={styles.laserController}>
            <Repeatable
              style={{ marginLeft: '6px' }}
              disabled={disabled}
              repeatDelay={500}
              repeatInterval={Math.floor(1000 / 15)}
              onHold={() => {
                this.handleChange(value + 1);
              }}
              onRelease={() => {
                this.handleChange(value + 1);
              }}
            >
              <button
                type="button"
                className={styles.laserControllerButton}
                disabled={disabled}
              >
              +
              </button>
            </Repeatable>
            <span className={styles.laserValue}>{value}</span>
            <span className={styles.laserValue}>%</span>
            <Repeatable
              style={{ marginLeft: '10px' }}
              disabled={disabled}
              repeatDelay={500}
              repeatInterval={Math.floor(1000 / 15)}
              onHold={() => {
                this.handleChange(value - 1);
              }}
              onRelease={() => {
                this.handleChange(value - 1);
              }}
            >
              <button
                type="button"
                className={styles.laserControllerButton}
                disabled={disabled}
              >
              -
              </button>
            </Repeatable>
          </div>
        </div>
      );
    }
}

export default LaserSliderInput;
