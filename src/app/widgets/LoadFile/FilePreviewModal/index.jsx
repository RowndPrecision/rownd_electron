import React, { PureComponent } from 'react';
import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import escape from 'lodash/escape';
import cx from 'classnames';
import espController from 'app/lib/controller';
import VirtualList from 'react-tiny-virtual-list';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';
import RowndButton from '../../components/RowndButton';
import styles from './index.styl';
import {
  METRIC_UNITS,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_IDLE,
  GRBL_ACTIVE_STATE_ALARM,
} from '../../../constants';

class FilePreviewModal extends PureComponent {
    static propTypes = {
      onClose: PropTypes.func,
      deviceMode: PropTypes.string,
      gcodeContent: PropTypes.string
    };

    state = this.getInitialState();

    controllerEvents = {
      'serialport:open': (options) => {
        const { port } = options;
        this.setState(() => ({ port: port }));
      },
      'serialport:close': () => {
        const initialState = this.getInitialState();
        this.setState(() => ({ ...initialState }));
      },
      'sender:status': (data) => {
        const { total, sent, received, startTime, finishTime, elapsedTime, remainingTime } = data;

        this.setState({
          total,
          sent,
          received,
          startTime,
          finishTime,
          elapsedTime,
          remainingTime
        });
      },
      'workflow:state': (workflowState) => {
        this.setState(state => ({
          workflow: {
            ...state.workflow,
            state: workflowState
          }
        }));
      },
      'controller:state': (type, controllerState) => {
        this.setState(state => ({
          controller: {
            ...state.controller,
            type: type,
            state: controllerState
          },
        }));
      }
    }

    componentDidMount() {
      this.addControllerEvents();
    }

    componentWillUnmount() {
      this.removeControllerEvents();
    }

    getInitialState() {
      return {
        port: espController.port,
        units: METRIC_UNITS,
        controller: {
          type: espController.type,
          state: espController.state
        },
        workflow: {
          state: espController.workflow.state
        },
        // G-code Status (from server)
        total: 0,
        sent: 0,
        received: 0,
        startTime: 0,
        finishTime: 0,
        elapsedTime: 0,
        remainingTime: 0,
        content: ''
      };
    }

    addControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        espController.addListener(eventName, callback);
      });
    }

    removeControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        espController.removeListener(eventName, callback);
      });
    }

    canRun() {
      const { port, workflow, controller } = this.state;
      const controllerState = controller.state;

      if (!port) {
        return false;
      }
      if (!includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state)) {
        return false;
      }
      const activeState = get(controllerState, 'status.activeState');
      const states = [
        GRBL_ACTIVE_STATE_ALARM
      ];
      if (includes(states, activeState)) {
        return false;
      }

      return true;
    }

    render() {
      const { workflow, port } = this.state;
      const { onClose } = this.props;
      const state = {
        ...this.state,
      };

      const canClick = !!port;
      const isReady = canClick;
      const canRun = this.canRun();
      const canClose = isReady && includes([WORKFLOW_STATE_IDLE], workflow.state);

      const lines = this.props.gcodeContent
        .split('\n').filter(line => line.trim().length > 0);

      return (
        <Modal showCloseButton={false}>
          <div className={styles.filePreviewModal}>
            <div className={styles.filePreviewModalHeader}>
              <div className={styles.filePreviewModalHeaderText}>G-Code Preview</div>
            </div>
            <div className={styles.filePreviewModalContent}>
              {lines.length > 0 && (
                <VirtualList
                  width="100%"
                  height={Math.min((lines.length * 20) > 500 ? 500 : (lines.length * 20), 500)}
                  style={{
                    color: 'white'
                  }}
                  itemCount={lines.length}
                  itemSize={20}
                  renderItem={({ index, style }) => (
                    <div key={index} style={style}>
                      <div className={styles.line}>
                        <span className={cx(styles.label, styles.labelDefault)}>
                          {index + 1}
                        </span>
                        {escape(lines[index])}
                      </div>
                    </div>
                  )}
                  scrollToIndex={state.sent}
                />
              )}
            </div>
            <div className={styles.filePreviewModalFooter}>
              <div className={styles.filePreviewModalFooterActionsWorkflowControlButtons}>
                { canRun && (
                  <RowndButton
                    title={i18n._('Run')}
                    type="primary"
                    onClick={() => {
                      onClose(true);
                    }}
                    disabled={!canRun}
                  />
                ) }
                {canClose && (
                  <RowndButton
                    type="primary"
                    title={i18n._('Close')}
                    onClick={() => {
                      onClose(false);
                    }}
                    disabled={!canClose}
                  />
                )}
              </div>
            </div>
          </div>
        </Modal>
      );
    }
}

export default FilePreviewModal;
