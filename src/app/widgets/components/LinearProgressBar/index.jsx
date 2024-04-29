import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

class LinearProgressBar extends PureComponent {
    static propTypes = {
      value: PropTypes.object,
      max: PropTypes.object
    };

    render() {
      const { value, max } = this.props;
      const percentage = (value / max) * 100;

      // Inline styles for the filled part of the progress bar
      const fillerStyles = {
        height: '100%',
        width: `${percentage}%`,
        backgroundColor: 'green',
        transition: 'width 0.2s ease-in-out',
        textAlign: 'center',
        lineHeight: '20px',
        borderRadius: '50px'
      };

      return (
        <div
          style={{
            position: 'relative',
            height: '24px',
            width: '100%',
            borderRadius: '50px',
            border: '1px solid #333',
          }}
        >
          <div style={fillerStyles}>
            <span
              style={{ color: 'white', fontWeight: 'bold', padding: '1px 24px', position: 'absolute' }}
            >{`${Math.round(percentage)}%`}
            </span>
          </div>
        </div>
      );
    }
}

export default LinearProgressBar;
