import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { in2mm, mapPositionToUnits } from 'app/lib/units';
import mapValues from 'lodash/mapValues';
import espController from 'app/lib/controller';
import Modal from 'app/components/Modal';
import {
  METRIC_UNITS,
  AXIS_X,
  AXIS_Z,
  AXIS_C,
  FOUR_AXIS_DEVICE_MODE
} from '../../../constants';
import RowndButton from '../../components/RowndButton';
import DeviceAxePositon from '../../DeviceAxes/DeviceAxePositon';
import computerConnectedIcon from './images/computer-connected.svg';
import styles from './index.styl';
import Speedometer from '../../DeviceController/Speedometer';

class ComputerConnectionModal extends PureComponent {
    static propTypes = {
        onClose: PropTypes.func,
        deviceMode: PropTypes.string
    };

    state = this.getInitialState();

    controllerEvents = {
        'controller:state': (type, controllerState) => {
            const { status } = { ...controllerState };
            const { mpos, wpos } = status;
            const $13 = Number(get(espController.settings, 'settings.$13', 0)) || 0;
  
            this.setState(state => ({
              controller: {
                ...state.controller,
                type: type,
                state: controllerState
              },
              // Machine position are reported in mm ($13=0) or inches ($13=1)
              machinePosition: mapValues({
                ...state.machinePosition,
                ...mpos
              }, (val) => {
                return ($13 > 0) ? in2mm(val) : val;
              }),
              // Work position are reported in mm ($13=0) or inches ($13=1)
              workPosition: mapValues({
                ...state.workPosition,
                ...wpos
              }, val => {
                return ($13 > 0) ? in2mm(val) : val;
              })
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
          units: METRIC_UNITS,
          controller: {
            type: espController.type,
            state: espController.state
          },
          machinePosition: { // Machine position
            x: '0.000',
            y: '0.000',
            z: '0.000',
            a: '0.000',
            b: '0.000',
            c: '0.000'
          },
          workPosition: { // Work position
            x: '0.000',
            y: '0.000',
            z: '0.000',
            a: '0.000',
            b: '0.000',
            c: '0.000'
          },
          spindleSpeed: 0
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

      handleSpindleSpeedChange(value) {
        const spindleSpeed = Number(value) || 0;
        this.setState({ spindleSpeed: spindleSpeed });
      }

      render() {
        const { units, machinePosition, workPosition } = this.state;
        const { onClose, deviceMode} = this.props;
        const state = {
          ...this.state,
          // Output machine position with the display units
          machinePosition: mapValues(machinePosition, (pos, axis) => {
            return String(mapPositionToUnits(pos, units));
          }),
          // Output work position with the display units
          workPosition: mapValues(workPosition, (pos, axis) => {
            return String(mapPositionToUnits(pos, units));
          })
        };

        const mposXAsix = state.machinePosition[AXIS_X] || '0.000';
        const mposCAsix = state.machinePosition[AXIS_C] || '0.000';
        const mposZAsix = state.machinePosition[AXIS_Z] || '0.000';
        const wposXAsix = state.workPosition[AXIS_X] || '0.000';
        const wposCAsix = state.workPosition[AXIS_C] || '0.000';
        const wposZAxis = state.workPosition[AXIS_Z] || '0.000';

        return (
            <Modal showCloseButton={false}>
            <div className={styles.computerConnectedModal}>
              <div className={styles.computerConnectedModalHeader}>
                <img src={computerConnectedIcon} className={styles.computerConnectedModalHeaderIcon} />
                <div className={styles.computerConnectedModalHeaderText}>Computer Connected</div>
              </div>
              <div className={styles.computerConnectedModalContent}>
              <div className={styles.computerConnectedModalContentAxePositions}>
                <DeviceAxePositon
                    name="X"
                    machinePosition={mposXAsix}
                    workPosition={wposXAsix}
                />
                <DeviceAxePositon
                    name="C"
                    machinePosition={mposCAsix}
                    workPosition={wposCAsix}
                    />
                <DeviceAxePositon
                    name="Z"
                    machinePosition={mposZAsix}
                    workPosition={wposZAxis}
                />
            </div>
                <div className={styles.computerConnectedModalContentSpeedometer}>
                <Speedometer
            min={0}
            max={(deviceMode === FOUR_AXIS_DEVICE_MODE) ? 12000 : 3000}
            step={10}
            unitName={'RPM'}
            disabled={true}
            cur={20}
            onlyShowSpeedometer={true}
          />
                </div>
              </div>
              <div className={styles.computerConnectedModalFooter}>
              <RowndButton type="secondary" onClick={() => onClose()} title="Disconnect"/>
              </div>
            </div>
          </Modal>
        )
      }
}

export default ComputerConnectionModal;