import React from 'react';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

const HelpContainer = () => {
  return (
    <div className={styles.helpContainer}>
      <button
        type="button"
        className="btn btn-default"
        onClick={() => {
          const url = 'https://rownd-electron-update-server.vercel.app';
          window.open(url, '_blank');
        }}
      >
        {i18n._('Downloads')}
      </button>
    </div>
  );
};

export default HelpContainer;
