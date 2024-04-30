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
  if (computerConnection && computerConnection.isOpen) {
    log.error('Cannot open computer connection port ');
    return;
  }

  const espController = store.get('controllers["' + req.body.espPort + '"]');
  if (!espController) {
    log.error('ESP Controller not found');
    return;
  }

  SerialPort.list()
    .then(ports => {
      ports.forEach(port => {
        if (port.manufacturer === 'Silicon Labs') {
          computerConnection = new SerialConnection({
            path: ports[1].path,
            baudRate: 115200
          });
          return;
        }
      });

      computerConnection.open((err) => {
        if (err) {
          log.error(`Error opening serial port "${ports[1].path}":`, err);
          return;
        }

        log.debug(`Connected to serial port "${ports[1].path}"`);

        computerConnection.on('data', connectionEventListener.data);
        computerConnection.on('close', connectionEventListener.close);
        computerConnection.on('error', connectionEventListener.error);
        espController.connection.on('data', connectionEventListener.espData);

        // res.send({
        //   data: `Connected to serial port "${ports[1].path}"`
        // });
      });

      const connectionEventListener = {
        data: (data) => {
          espController.command('gcode', data, (err, state) => {
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
        },
        espData: (data) => {
          computerConnection.write(data + '\n');
        },
      };
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
