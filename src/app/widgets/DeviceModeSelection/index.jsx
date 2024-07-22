import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import i18n from 'app/lib/i18n';
import { FOUR_AXIS_DEVICE_MODE, LATHE_DEVICE_MODE, LASER_DEVICE_MODE } from 'app/constants';
import styles from './index.styl';

class DeviceModeSelection extends PureComponent {
    static propTypes = {
      selectedDeviceMode: PropTypes.string,
      modes: PropTypes.arrayOf(PropTypes.string).isRequired,
      onChange: PropTypes.func
    };

    constructor(props) {
      super(props);
      this.state = {
        selectedMode: props.selectedDeviceMode || props.modes[0],
      };
    }

    componentDidUpdate(prevProps) {
      if (this.props.selectedDeviceMode !== prevProps.selectedDeviceMode) {
        this.setState({ selectedMode: this.props.selectedDeviceMode });
      }
    }

      handleSelection = (mode) => {
        this.setState({ selectedMode: mode });

        this.props.onChange(mode);
      };

      render() {
        const { modes } = this.props;
        const { selectedMode } = this.state;

        return (
          <div className={styles.deviceModeSelectionWidget}>
            {modes.map((mode, index) => {
              const isSelected = mode === selectedMode;
              return (
                <button
                  type="button"
                  onClick={() => this.handleSelection(mode)}
                  className={cx(styles.mode, { [styles.selected]: isSelected })}
                  key={index}
                >
                  { mode === FOUR_AXIS_DEVICE_MODE && <p>{i18n._('PWM')} </p> }
                  { mode === LATHE_DEVICE_MODE && <p>{i18n._('ASDACN1')} </p> }
                  { mode === LASER_DEVICE_MODE && <p>{i18n._('LASER')} </p> }
                  <p style={{ fontSize: '16px' }}>Mode</p>
                </button>
              );
            })}
          </div>
        );
      }
}

export default DeviceModeSelection;
