import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Image from 'app/components/Image';
import cx from 'classnames';
import styles from './index.styl';

class RowndButton extends PureComponent {
    static propTypes = {
      title: PropTypes.string,
      icon: PropTypes.string,
      type: PropTypes.oneOf([
        'primary',
        'secondary',
        'tertiary',
      ]).isRequired,
      onClick: PropTypes.func,
      disabled: PropTypes.bool,
    };

    render() {
      const { title, icon, type, disabled, onClick } = this.props;

      let buttonClassNames = cx(styles.rowndButton, {
        [styles.primary]: type === 'primary',
        [styles.secondary]: type === 'secondary',
        [styles.tertiary]: type === 'tertiary',
      });

      return (
        <button
          type="button"
          className={buttonClassNames}
          disabled={disabled}
          onClick={onClick}
        >
          {icon && <Image src={icon} className={styles.iconWrapper} />}
          <span className={styles.titleWrapper}>{title}</span>
        </button>
      );
    }
}

export default RowndButton;
