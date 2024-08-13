import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import isElectron from 'is-electron';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';
import portal from 'app/lib/portal';
import Modal from 'app/components/Modal';
import styles from './index.styl';
import DeviceConsole from '../../widgets/DeviceConsole';
import DraggablePopup from '../../widgets/components/DraggablePopup';

class QuickAccessToolbar extends PureComponent {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object
    };

    constructor(props) {
      super(props);
      this.state = {
        isPopupOpen: false
      };
    }

  togglePopup = () => {
    this.setState(prevState => ({ isPopupOpen: !prevState.isPopupOpen }));
  };

    command = {
      'console': () => {
        this.setState(prevState => ({ isPopupOpen: !prevState.isPopupOpen }));
      },
      'keyboard': async () => {
        if (isElectron()) {
          const { ipcRenderer } = window.require('electron');
          await ipcRenderer.invoke('run-screen-keyboard-script');
        }
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
          <DraggablePopup isOpen={this.state.isPopupOpen} onClose={this.togglePopup}>
            <DeviceConsole />
          </DraggablePopup>
          <ul className="nav navbar-nav">
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
            <li className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className="btn btn-default"
                onClick={this.command.keyboard}
                title={i18n._('Screen Keyboard')}
              >
                <i className="fa fa-keyboard" />
                <Space width="8" />
                {i18n._('Screen Keyboard')}
              </button>
            </li>
          </ul>
        </div>
      );
    }
}

export default QuickAccessToolbar;
