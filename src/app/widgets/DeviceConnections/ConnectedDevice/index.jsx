import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Image from 'app/components/Image';
import cx from 'classnames';
import styles from './index.styl';
import RowndButton from '../../components/RowndButton';
import connectedIcon from './images/connected-icon.svg';
import notConnectIcon from './images/not-connect-icon.svg';

class ConnectedDevice extends PureComponent {
    static propTypes = {
      deviceName: PropTypes.string.isRequired,
      isConnected: PropTypes.bool.isRequired,
      infoText: PropTypes.string,
      onTapAction: PropTypes.func,
      isManualConnectable: PropTypes.bool
    };

    render() {
      const { isConnected, deviceName, infoText, onTapAction, isManualConnectable } = this.props;

      return (
        <div className={
          cx(styles.connectedDevice,
            { [styles.connected]: isConnected,
              [styles.disconnected]: !isConnected, })}
        >
          <div className={styles.deviceNameTitle}>{deviceName}</div>
          <div className={styles.connectionStatus}>
            <Image src={isConnected ? connectedIcon : notConnectIcon} className={styles.connectionStatusIcon} />
            <div className={styles.connectionStatusTitle}>{isConnected ? 'Connected' : 'Not Connect'}</div>
          </div>
          <div className={styles.action}>
            {isManualConnectable
              ? <RowndButton type="tertiary" onClick={onTapAction} title={isConnected ? 'Refresh' : 'Connect'} />
              : <span className={styles.infoText}>{infoText}</span>}
          </div>
        </div>
      );
    }
}

export default ConnectedDevice;
