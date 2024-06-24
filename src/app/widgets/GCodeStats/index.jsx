import mapValues from 'lodash/mapValues';
import moment from 'moment';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import controller from 'app/lib/controller';
import { mapPositionToUnits } from 'app/lib/units';
import i18n from 'app/lib/i18n';
import styles from './index.styl';
import {
  GRBL,
  // Units
  IMPERIAL_UNITS,
  METRIC_UNITS
} from '../../constants';

const formatISODateTime = (time) => {
  return time > 0 ? moment.unix(time / 1000).format('YYYY-MM-DD HH:mm:ss') : '–';
};

const formatElapsedTime = (elapsedTime) => {
  if (!elapsedTime || elapsedTime < 0) {
    return '–';
  }
  const d = moment.duration(elapsedTime, 'ms');
  return moment(d._data).format('HH:mm:ss');
};

const formatRemainingTime = (remainingTime) => {
  if (!remainingTime || remainingTime < 0) {
    return '–';
  }
  const d = moment.duration(remainingTime, 'ms');
  return moment(d._data).format('HH:mm:ss');
};

class GCodeStats extends PureComponent {
    static propTypes = {
    };

    state = this.getInitialState();

    controllerEvents = {
      'serialport:open': (options) => {
        const { port } = options;
        this.setState({ port: port });
      },
      'serialport:close': (options) => {
        const initialState = this.getInitialState();
        this.setState({ ...initialState });
      },
      'gcode:unload': () => {
        this.setState({
          bbox: {
            min: {
              x: 0,
              y: 0,
              z: 0
            },
            max: {
              x: 0,
              y: 0,
              z: 0
            },
            delta: {
              x: 0,
              y: 0,
              z: 0
            }
          }
        });
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
      'controller:state': (type, state) => {
        // Grbl
        if (type === GRBL) {
          const { parserstate } = { ...state };
          const { modal = {} } = { ...parserstate };
          const units = {
            'G20': IMPERIAL_UNITS,
            'G21': METRIC_UNITS
          }[modal.units] || this.state.units;

          if (this.state.units !== units) {
            this.setState({ units: units });
          }
        }
      }
    };

    pubsubTokens = [];

    componentDidMount() {
      this.subscribe();
      this.addControllerEvents();
    }

    componentWillUnmount() {
      this.removeControllerEvents();
      this.unsubscribe();
    }

    getInitialState() {
      return {
        port: controller.port,
        units: METRIC_UNITS,

        // G-code Status (from server)
        total: 0,
        sent: 0,
        received: 0,
        startTime: 0,
        finishTime: 0,
        elapsedTime: 0,
        remainingTime: 0,

        // Bounding box
        bbox: {
          min: {
            x: 0,
            y: 0,
            z: 0
          },
          max: {
            x: 0,
            y: 0,
            z: 0
          },
          delta: {
            x: 0,
            y: 0,
            z: 0
          }
        }
      };
    }

    subscribe() {
      const tokens = [
        pubsub.subscribe('gcode:bbox', (msg, bbox) => {
          const dX = bbox.max.x - bbox.min.x;
          const dY = bbox.max.y - bbox.min.y;
          const dZ = bbox.max.z - bbox.min.z;

          this.setState({
            bbox: {
              min: {
                x: bbox.min.x,
                y: bbox.min.y,
                z: bbox.min.z
              },
              max: {
                x: bbox.max.x,
                y: bbox.max.y,
                z: bbox.max.z
              },
              delta: {
                x: dX,
                y: dY,
                z: dZ
              }
            }
          });
        })
      ];
      this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }

    unsubscribe() {
      this.pubsubTokens.forEach((token) => {
        pubsub.unsubscribe(token);
      });
      this.pubsubTokens = [];
    }

    addControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        controller.addListener(eventName, callback);
      });
    }

    removeControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        controller.removeListener(eventName, callback);
      });
    }

    render() {
      const { units, bbox } = this.state;
      const state = {
        ...this.state,
        bbox: mapValues(bbox, (position) => {
          return mapValues(position, (pos, axis) => {
            return mapPositionToUnits(pos, units);
          });
        })
      };
      //const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
      const startTime = formatISODateTime(state.startTime);
      const finishTime = formatISODateTime(state.finishTime);
      const elapsedTime = formatElapsedTime(state.elapsedTime);
      const remainingTime = formatRemainingTime(state.remainingTime);

      return (
        <div className={styles['gcode-stats']}>
          <div className="row no-gutters" style={{ marginBottom: 10 }}>
            <div className="col-xs-6">
              <div>{i18n._('Sent')}</div>
              <div>{state.total > 0 ? `${state.sent} / ${state.total}` : '–'}</div>
            </div>
            <div className="col-xs-6">
              <div>{i18n._('Received')}</div>
              <div>{state.total > 0 ? `${state.received} / ${state.total}` : '–'}</div>
            </div>
          </div>
          <div className="row no-gutters" style={{ marginBottom: 10 }}>
            <div className="col-xs-6">
              <div>{i18n._('Start Time')}</div>
              <div>{startTime}</div>
            </div>
            <div className="col-xs-6">
              <div>{i18n._('Elapsed Time')}</div>
              <div>{elapsedTime}</div>
            </div>
          </div>
          <div className="row no-gutters">
            <div className="col-xs-6">
              <div>{i18n._('Finish Time')}</div>
              <div>{finishTime}</div>
            </div>
            <div className="col-xs-6">
              <div>{i18n._('Remaining Time')}</div>
              <div>{remainingTime}</div>
            </div>
          </div>
        </div>
      );
    }
}

export default GCodeStats;
