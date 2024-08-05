/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import styles from './index.styl';

class DeviceAxePositon extends PureComponent {
    static propTypes = {
      label: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      machinePosition: PropTypes.string,
      workPosition: PropTypes.string,
      onClick: PropTypes.func
    };

    render() {
      const { name, machinePosition, workPosition, onClick, label } = this.props;

      return (
        <div className={styles.deviceAxe} onClick={onClick}>
          <div className={styles.axeLabel}>
            <span>{label} <br /><br /> {name}</span>
          </div>
          <div className={styles.positions}>
            <div className={styles.workPosition}>
              <span>{workPosition.split('.')[0]}</span>
              <span>.</span>
              <span>{workPosition.split('.')[1]}</span>
            </div>
            <div className={styles.machinePosition}>
              <span>{machinePosition.split('.')[0]}</span>
              <span>.</span>
              <span>{machinePosition.split('.')[1]}</span>
            </div>
          </div>
        </div>
      );
    }
}

export default DeviceAxePositon;
