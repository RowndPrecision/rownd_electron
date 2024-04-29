import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Repeatable from 'react-repeatable';
import cx from 'classnames';
import styles from './index.styl';

class Speedometer extends PureComponent {
    static propTypes = {
      min: PropTypes.number,
      max: PropTypes.number,
      unitName: PropTypes.string,
      onChange: PropTypes.func,
      disabled: PropTypes.bool,
      step: PropTypes.number
    };

    constructor(props) {
      super(props);

      this.state = {
        currentValue: 0
      };
      this.totalLines = 100;
    }

    createLineElements(filledPercent) {
      const filledLines = Math.round((filledPercent / 100) * this.totalLines);
      const lineElements = [];

      for (let i = 0; i < this.totalLines; i += 1) {
        const isLongLine = i % 20 === 0 || i + 1 === this.totalLines;
        const rotationDegree = (i / this.totalLines) * 270 - 135;

        const style = {
          transform: `rotate(${rotationDegree}deg) translate(-100%, -800%)`,
          backgroundColor: i < filledLines ? '#9747FF' : '',
        };

        lineElements.push(
          <div
            key={i}
            className={cx(
              styles.speedometerLine,
              {
                [styles.speedometerLongLine]: isLongLine
              }
            )}
            style={style}
          />,
        );
      }

      return lineElements;
    }

    updateValue(offset) {
      const { min, max } = this.props;
      const newValue = Math.min(Math.max(this.state.currentValue + offset, min), max);
      this.props.onChange(newValue);

      this.setState({ currentValue: newValue });
    }

    render() {
      const { currentValue } = this.state;
      const { min, max, unitName, disabled, step } = this.props;
      const lines = this.createLineElements((currentValue / max) * 100);

      return (
        <div className={styles.speedometerContainer}>
          <div className={styles.speedometer}>
            <div className={styles.speedLabel}>
              <div className={styles.currentSpeedValue}>{currentValue}</div>
              <div className={styles.speedUnit}>{unitName}</div>
            </div>
            {lines}
          </div>
          <div className={styles.numberPicker}>
            <Repeatable
              disabled={disabled}
              repeatDelay={500}
              repeatInterval={Math.floor(1000 / 15)}
              onHold={() => this.updateValue(-step)}
              onRelease={() => this.updateValue(-step)}
            >
              <button
                type="button"
                onClick={() => this.updateValue(-step)}
                disabled={disabled}
                className={styles.numberPickerButton}
              >
              -
              </button>
            </Repeatable>
            <input
              type="number"
              className={styles.numberInput}
              value={currentValue}
              min={min}
              max={max}
              readOnly
            />
            <Repeatable
              disabled={disabled}
              repeatDelay={500}
              repeatInterval={Math.floor(1000 / 15)}
              onHold={() => this.updateValue(step)}
              onRelease={() => this.updateValue(step)}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => this.updateValue(step)}
                className={styles.numberPickerButton}
              >
              +
              </button>
            </Repeatable>
          </div>
        </div>
      );
    }
}

export default Speedometer;
