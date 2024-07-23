import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Repeatable from 'react-repeatable';
import styles from './index.styl';

class SliderInput extends PureComponent {
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

      componentDidMount() {
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
        this.setState({ value: value }, () => {
            this.props.onChange(value)
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
                  style={{ marginLeft: '10px' }}
                  disabled={disabled}
                  repeatDelay={500}
                  repeatInterval={Math.floor(1000 / 15)}
                  onHold={() => {
                    this.handleChange(value + 1)
                  }}
                  onRelease={() => {
                    this.handleChange(value + 1)
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
                  style={{ marginLeft: '14px' }}
                  disabled={disabled}
                  repeatDelay={500}
                  repeatInterval={Math.floor(1000 / 15)}
                  onHold={() => {
                    this.handleChange(value - 1)
                  }}
                  onRelease={() => {
                    const distance = this.getJogDistance();
                    this.handleChange(value - 1)
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

export default SliderInput;