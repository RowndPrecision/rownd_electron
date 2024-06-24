/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { PureComponent } from 'react';
import Draggable from 'react-draggable';
import cx from 'classnames';
import styles from './index.styl';

class DraggablePopup extends PureComponent {
  render() {
    const { children, isOpen, onClose } = this.props;

    if (!isOpen) {
      return null;
    }

    return (
      <Draggable handle=".handle">
        <div className={styles.draggablePopup}>
          <div className={cx(styles['draggablePopup-header'], 'handle')}>
            <span className={styles['draggablePopup-close-button']} onClick={onClose}>X</span>
          </div>
          <div className={styles['draggablePopup-content']}>
            {children}
          </div>
        </div>
      </Draggable>
    );
  }
}

export default DraggablePopup;
