import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import portal from 'app/lib/portal';
import Modal from 'app/components/Modal';
import styles from './index.styl';
import DeviceConsole from '../../widgets/DeviceConsole';

class QuickAccessToolbar extends PureComponent {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object
    };

    command = {
      'cyclestart': () => {
        controller.command('cyclestart');
      },
      'feedhold': () => {
        controller.command('feedhold');
      },
      'console': () => {
        this.openConsoleWidgetModal();
      },
    };

    openConsoleWidgetModal() {
      portal(({ onClose }) => (
        <Modal size="lg" onClose={onClose}>
          <Modal.Header>
            <Modal.Title>
              {i18n._('Console')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <DeviceConsole />
          </Modal.Body>
          <Modal.Footer>
          </Modal.Footer>
        </Modal>
      ));
    }

    render() {
      return (
        <div className={styles.quickAccessToolbar}>
          <ul className="nav navbar-nav">
            <li className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.command.cyclestart}
                title={i18n._('Cycle Start')}
              >
                <i className="fa fa-repeat" />
                <Space width="8" />
                {i18n._('Cycle Start')}
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={this.command.feedhold}
                title={i18n._('Feedhold')}
              >
                <i className="fa fa-hand-paper-o" />
                <Space width="8" />
                {i18n._('Feedhold')}
              </button>
            </li>
            <li className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className="btn btn-default"
                onClick={this.command.console}
                title={i18n._('Console')}
              >
                <i className="fa fa-terminal" />
                <Space width="8" />
                {i18n._('Console')}
              </button>
            </li>
          </ul>
        </div>
      );
    }
}

export default QuickAccessToolbar;
