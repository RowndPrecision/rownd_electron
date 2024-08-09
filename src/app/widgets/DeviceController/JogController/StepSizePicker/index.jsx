import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Repeatable from 'react-repeatable';
//import cx from 'classnames';
import styles from './index.styl';

class StepSizePicker extends PureComponent {
    static propTypes = {
      canStepBackward: PropTypes.bool,
      canStepForward: PropTypes.bool,
      onStepBackward: PropTypes.func,
      onStepForward: PropTypes.func,
      value: PropTypes.number,
      unit: PropTypes.string
    };

    render() {
      const { value, unit, onStepBackward, onStepForward, canStepBackward, canStepForward } = this.props;
      return (
        <div className={styles.stepSizePicker}>
          <Repeatable
            disabled={!canStepBackward}
            repeatDelay={500}
            repeatInterval={Math.floor(1000 / 15)}
            //onHold={onStepBackward}
            onRelease={onStepBackward}
          >
            <button
              type="button"
              className={styles.changeButton}
              disabled={!canStepBackward}
            >
              {'<'}
            </button>
          </Repeatable>
          <div className={styles.displayValue}>
            {value} {unit}
          </div>
          <Repeatable
            disabled={!canStepForward}
            repeatDelay={500}
            repeatInterval={Math.floor(1000 / 15)}
            //onHold={onStepForward}
            onRelease={onStepForward}
          >
            <button
              type="button"
              className={styles.changeButton}
              disabled={!canStepForward}
            >
              {'>'}
            </button>
          </Repeatable>
        </div>
      );
    }
}

export default StepSizePicker;
