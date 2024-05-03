import noop from 'lodash/noop';
import { spawn } from 'child_process';
import socketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import settings from '../../config/settings';
import logger from '../../lib/logger';
import {
  authorizeIPAddress,
  validateUser
} from '../../access-control';

const log = logger('service:gamepadconnection');

class GamepadConnection {
    server = null;

    io = null;

    socket = null;

    process = null;

    eventListener = {
      processSuccess: (data) => {
        if (data.includes('Successfully connected to device')) {
          this.socket.emit('gamepad:bleconnected', true);
        }
      },
      processError: (data) => {
        console.log('processError', data);
        this.socket.emit('gamepad:bleconnected', false);
      },
      processClose: (code) => {
        this.socket.emit('gamepad:bleconnected', false);
        console.log('processClose', code);
      }
    }

    start(server) {
      this.server = server;
      this.io = socketIO(this.server, {
        serveClient: true,
        path: '/gamepad-socket.io'
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
        socket.on('open', (callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.open("gamepad connection, id=${socket.id}`);

          this.open();

          callback();
        });

        socket.on('gamepad:scanandpair', (callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.open("gamepad connection, id=${socket.id}`);

          this.process.stdin.write('scanAndPair\n');

          callback();
        });

        socket.on('gamepad:removealldevices', (callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.open("gamepad connection, id=${socket.id}`);

          this.process.stdin.write('removeAllDevices\n');

          callback();
        });

        // Close serial port
        socket.on('close', (port, callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          this.close();

          // Leave the room
          socket.leave(port);
        });
      });
    }

    open() {
      const scriptPath = './scripts/btScan.py';
      this.process = spawn('python3', [scriptPath]);
      this.process.stdout.on('data', this.eventListener.processSuccess);
      this.process.stderr.on('data', this.eventListener.processError);
      this.process.stderr.on('close', this.eventListener.processClose);
    }

    close() {}

    stop() {
      if (this.process && !this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }
}

export default GamepadConnection;
