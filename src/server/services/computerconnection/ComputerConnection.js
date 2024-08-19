import noop from 'lodash/noop';
import socketIO from 'socket.io';
import _ from 'lodash';
import socketioJwt from 'socketio-jwt';
import settings from '../../config/settings';
import logger from '../../lib/logger';
import store from '../../store';
import SerialConnection from '../../lib/SerialConnection';
import {
  authorizeIPAddress,
  validateUser
} from '../../access-control';
import { GRBL_REALTIME_COMMANDS } from '../../controllers/Grbl/constants';

const log = logger('service:computerconnection');

class ComputerConnection {
    server = null;

    io = null;

    connection = null;

    espController = null;

    socket = null;

    port = null;

    espPort = null;

    isSendedFirstReportOK = false

    connectionEventListener = {
      data: (data) => {
        this.espController.command('computer-connection:gcode', data, (err, state) => {
          this.socket.emit('computer:data', data, err, state);
        });
      },
      close: (err) => {
        this.socket.emit('computer:close', err);
      },
      error: (err) => {
        if (err) {
          log.error(`Unexpected error while reading/writing serial port "${this.port.port}":`, err);
        }
        this.socket.emit('computer:error', err);
      },
      espData: (data) => {
        if (!this.connection) {
          return;
        }
        const command = data.trim();
        if (command.length === 0) {
          return;
        }
        if (command === 'ok' && !this.isSendedFirstReportOK) {
          this.isSendedFirstReportOK = true;
          return;
        }
        console.log('espdata', command);
        this.writeln(command);
        this.socket.emit('computer-esp:data', command);
      },
    };

    write(data, context) {
      // Assertion check
      if (this.isClose()) {
        log.error(`Serial port "${this.options.port}" is not accessible`);
        return;
      }

      this.connection.write(data);
    }

    writeln(data, context) {
      if (_.includes(GRBL_REALTIME_COMMANDS, data)) {
        this.write(data, context);
      } else {
        this.write(data + '\n', context);
      }
    }

    isOpen() {
      return this.connection && this.connection.isOpen;
    }

    isClose() {
      return !(this.isOpen());
    }

    start(server) {
      this.server = server;
      this.io = socketIO(this.server, {
        serveClient: true,
        path: '/computer-socket.io'
      });

      this.io.use(socketioJwt.authorize({
        secret: settings.secret,
        handshake: true
      }));

      this.io.use(async (socket, next) => {
        try {
          // IP Address Access Control
          const ipaddr = socket.handshake.address;
          await authorizeIPAddress(ipaddr);

          // User Validation
          const user = socket.decoded_token || {};
          await validateUser(user);
        } catch (err) {
          log.warn(err);
          next(err);
          return;
        }

        next();
      });

      this.io.on('connection', (socket) => {
        const address = socket.handshake.address;
        const user = socket.decoded_token || {};

        this.socket = socket;

        socket.on('disconnect', () => {
          log.debug(`Disconnected from ${address}: id=${socket.id}, user.id=${user.id}, user.name=${user.name}`);
        });

        // Open serial port
        socket.on('open', (espPort, port, baudrate, callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.open("${JSON.stringify(port)}", esp port ${JSON.stringify(espPort)}): id=${socket.id}`);

          this.espPort = espPort;
          this.port = port;

          if (this.isOpen()) {
            this.close();
          }

          this.connection = new SerialConnection({
            path: port.port,
            baudRate: baudrate
          });

          this.open(espPort, port, (err) => {
            if (err) {
              log.error('Cannot open computer connection port ');
            }
          });

          callback(this.connection);
        });

        // Close serial port
        socket.on('close', (callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }
          this.close(callback);
        });
      });
    }

    open(espPort, port, callback = noop) {
      // Assertion check
      if (this.isOpen()) {
        log.error(`Cannot open serial port "${port}"`);
        return;
      }

      this.espController = store.get('controllers["' + espPort.port + '"]');
      if (!this.espController) {
        log.error('ESP Controller not found');
        callback(null);
        return;
      }

      this.connection.on('data', this.connectionEventListener.data);
      this.connection.on('close', this.connectionEventListener.close);
      this.connection.on('error', this.connectionEventListener.error);
      this.espController.connection.on('data', this.connectionEventListener.espData);

      this.connection.open((err) => {
        if (err) {
          log.error(`Error opening serial port "${port.port}":`, err);
          callback(err);
          return;
        }

        callback();

        log.debug(`Connected to serial port "${port.port}"`);
      });
    }

    close(callback) {
      // Assertion check
      if (!this.connection) {
        const err = 'Serial port is not available';
        callback(new Error(err));
        return;
      }

      if (this.isClose()) {
        callback(null);
        return;
      }

      this.connection.close(() => {
        this.connection.removeAllListeners();
        this.espController.connection.off('data', this.connectionEventListener.espData);
        this.isSendedFirstReportOK = false;

        this.connection = null;
        this.espController = null;
        this.espPort = null;
        this.port = null;

        callback();
      });
    }
}

export default ComputerConnection;
