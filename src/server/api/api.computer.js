//import _ from 'lodash';
import { SerialPort } from 'serialport';
//import controller from 'app/lib/controller';
import store from '../store';
import SerialConnection from '../lib/SerialConnection';
import logger from '../lib/logger';
//import { GRBL_REALTIME_COMMANDS } from '../controllers/Grbl/constants';

const log = logger('api:computer');

// const noop = _.noop;
// const CONFIG_KEY = 'computer';

let computerConnection = null;

export const connect = (req, res) => {
  SerialPort.list()
    .then(ports => {
      console.log(ports);
      computerConnection = new SerialConnection({
        path: ports[1].path,
        baudRate: 115200,
        writeFilter: (data) => {
          const line = data.trim();
          if (!line) {
            return data;
          }
          return data;
        }
      });

      if (computerConnection && computerConnection.isOpen) {
        log.error(`Cannot open serial port "${ports[1].path}"`);
        return;
      }

      const connectionEventListener = {
        data: (data) => {
          const controller = store.get('controllers["' + req.body.espPort + '"]');
          if (!controller) {
            console.log('Controller not found');
            return;
          }
          controller.command('gcode', data, (err, state) => {
            if (err) {
              console.log('Failed to send G-code: ' + err);
            }
            console.log('state', state);
          });
        },
        close: (err) => {
          if (computerConnection) {
            computerConnection = null;
          }
        },
        error: (err) => {
          if (err) {
            log.error(`Unexpected error while reading/writing serial port "${req.port}":`, err);
          }
        }
      };

      computerConnection.open((err) => {
        if (err) {
          log.error(`Error opening serial port "${ports[1].path}":`, err);
          return;
        }

        log.debug(`Connected to serial port "${ports[1].path}"`);

        res.send({
          data: `Connected to serial port "${ports[1].path}"`
        });
      });

      computerConnection.on('data', connectionEventListener.data);
      computerConnection.on('close', connectionEventListener.close);
      computerConnection.on('error', connectionEventListener.error);
    })
    .catch(err => {
      log.error(err);
    });
};

export const refreshConnection = (req, res) => {
  if (!computerConnection) {
    const err = `Serial port "${computerConnection.port}" is not available`;
    console.log(err);
    return;
  }

  if (!(computerConnection && computerConnection.isOpen)) {
    return;
  }

  computerConnection.removeAllListeners();
  computerConnection.close();
};

export const sendCommand = (req, res) => {
  if (!(computerConnection && computerConnection.isOpen)) {
    log.error(`Serial port "${this.options.port}" is not accessible`);
    return;
  }

  console.log(req.body.data);

  computerConnection.write(req.body.data + '\n');

//   if (_.includes(GRBL_REALTIME_COMMANDS, req)) {
//     computerConnection.write(req.body.data);
//   } else {
//     computerConnection.write(req + '\n');
//   }
};
