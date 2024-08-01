/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Repeatable from 'react-repeatable';
import cx from 'classnames';
import playArrowIcon from './images/play-arrow.svg';
import stopIcon from './images/stop.svg';
import styles from './index.styl';

class Speedometer extends PureComponent {
    static propTypes = {
      min: PropTypes.number,
      max: PropTypes.number,
      cur: PropTypes.number,
      unitName: PropTypes.string,
      onChange: PropTypes.func,
      onStart: PropTypes.func,
      onStop: PropTypes.func,
      disabled: PropTypes.bool,
      step: PropTypes.number,
      onlyShowSpeedometer: PropTypes.bool
    };

    constructor(props) {
      super(props);

      this.state = {
        currentValue: props.cur || 0,
        isClockwise: true,
        isRunning: false
      };
      this.totalLines = 100;
    }

    componentDidUpdate(prevProps) {
      if (this.props.cur !== prevProps.cur) {
        this.setState({ currentValue: this.props.cur });
      }
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
      const { min, max, onChange } = this.props;
      const { currentValue, isRunning, isClockwise } = this.state;
      const newValue = Math.min(Math.max(currentValue + offset, min), max);

      onChange(newValue, isClockwise, isRunning);
    }

    render() {
      const { currentValue, isRunning, isClockwise } = this.state;
      const { min, max, unitName, disabled, step, onStart, onStop, onlyShowSpeedometer } = this.props;
      const lines = this.createLineElements((currentValue / max) * 100);

      return (
        <div className={styles.speedometerContainer}>
          {!onlyShowSpeedometer && (
            <div className={styles.rotationControl}>
              <div
                className={styles.counterClockwiseButton}
                style={{ backgroundColor: !isClockwise ? '#9747FF' : '#111219' }}
                onClick={() => (!disabled ? this.setState({ isClockwise: false }, () => this.updateValue(0)) : null)}
              />
              <div
                className={styles.clockwiseButton}
                style={{ backgroundColor: isClockwise ? '#9747FF' : '#111219' }}
                onClick={() => (!disabled ? this.setState({ isClockwise: true }, () => this.updateValue(0)) : null)}
              />
            </div>
          )
          }
          <div className={styles.speedometer}>
            <div className={styles.speedLabel}>
              <div className={styles.currentSpeedValue}>{currentValue}</div>
              <div className={styles.speedUnit}>{unitName}</div>
            </div>
            {lines}
          </div>
          {!onlyShowSpeedometer && (
            <div
              className={styles.startStopButton}
              onClick={!disabled ? () => {
                this.setState({ isRunning: !isRunning }, () => {
                  isRunning ? onStop() : onStart(isClockwise);
                });
              } : null}
            >
              <img src={isRunning ? stopIcon : playArrowIcon} className={styles.startStopButtonIcon} alt="start-stop" />
              <div className={styles.startStopButtonText} style={{ color: isRunning ? '#DE0050' : '#36A900' }}>{isRunning ? 'Stop' : 'Start'}</div>
            </div>
          )
          }
          {!onlyShowSpeedometer && (
            <div className={styles.numberPicker}>
              <Repeatable
                disabled={disabled}
                repeatDelay={500}
                repeatInterval={Math.floor(1000 / 30)}
                onPress={() => this.updateValue(-step)}
                onHold={() => this.updateValue(-step)}
              >
                <button
                  type="button"
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
                repeatInterval={Math.floor(1000 / 30)}
                onHold={() => this.updateValue(step)}
                onPress={() => this.updateValue(step)}
              >
                <button
                  type="button"
                  disabled={disabled}
                  className={styles.numberPickerButton}
                >
              +
                </button>
              </Repeatable>
            </div>
          )
          }
        </div>
      );
    }
}

export default Speedometer;
