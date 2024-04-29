import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import styles from './index.styl';

class DeviceAxePositon extends PureComponent {
    static propTypes = {
      name: PropTypes.string.isRequired,
      machinePosition: PropTypes.string,
      workPosition: PropTypes.string
    };

    render() {
      const { name, machinePosition, workPosition } = this.props;

      return (
        <div className={styles.deviceAxe}>
          <div className={styles.axeLabel}>
            <span>POS <br /><br /> {name}</span>
          </div>
          <div className={styles.positions}>
            <div className={styles.machinePosition}>
              <span>{machinePosition.split('.')[0]}</span>
              <span>.</span>
              <span>{machinePosition.split('.')[1]}</span>
            </div>
            <div className={styles.workPosition}>
              <span>{workPosition.split('.')[0]}</span>
              <span>.</span>
              <span>{workPosition.split('.')[1]}</span>
            </div>
          </div>
        </div>
      );
    }
}

export default DeviceAxePositon;
