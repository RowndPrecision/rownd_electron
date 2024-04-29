import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
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
                  <p>{mode}</p>
                  <p style={{ fontSize: '16px' }}>Mode</p>
                </button>
              );
            })}
          </div>
        );
      }
}

export default DeviceModeSelection;
