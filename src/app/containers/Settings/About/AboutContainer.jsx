import PropTypes from 'prop-types';
import React from 'react';
import Anchor from 'app/components/Anchor';
import settings from 'app/config/settings';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

const AboutContainer = ({ version }) => {
  const wiki = 'https://www.rowndcnc.com';

  return (
    <div className={styles.aboutContainer}>
      <img src="images/logo-square-256x256.png" alt="" className={styles.productLogo} />
      <div className={styles.productDetails}>
        <div className={styles.aboutProductName}>
          {`${settings.productName} ${version.current}`}
        </div>
        <div className={styles.aboutProductDescription}>
          {i18n._('The Ultimate CNC Lathe Machine Unleashing Your Creative Journey')}
        </div>
        <Anchor
          className={styles.learnmore}
          href={wiki}
          target="_blank"
        >
          {i18n._('Learn more')}
          <i className="fa fa-arrow-circle-right" style={{ marginLeft: 5 }} />
        </Anchor>
      </div>
    </div>
  );
};

AboutContainer.propTypes = {
  version: PropTypes.object
};

export default AboutContainer;
