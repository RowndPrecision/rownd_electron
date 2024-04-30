import noop from 'lodash/noop';
import socketIO from 'socket.io';
//import socketioJwt from 'socketio-jwt';
//import settings from '../../config/settings';
import logger from '../../lib/logger';
import store from '../../store';
import SerialConnection from '../../lib/SerialConnection';
import {
  authorizeIPAddress,
  validateUser
} from '../../access-control';

const log = logger('service:computerconnection');

class ComputerConnection {
    server = null;

    io = null;

    sockets = [];

    computerConnection = null;

    start(server) {
      this.server = server;
      this.io = socketIO(this.server, {
        serveClient: true,
        path: '/socket2.io'
      });

      console.log(this.io);

      //   this.io.use(socketioJwt.authorize({
      //     secret: settings.secret,
      //     handshake: true
      //   }));

      //   this.io.use(async (socket, next) => {
      //     try {
      //       // IP Address Access Control
      //       const ipaddr = socket.handshake.address;
      //       await authorizeIPAddress(ipaddr);

      //       // User Validation
      //       const user = socket.decoded_token || {};
      //       await validateUser(user);
      //     } catch (err) {
      //       log.warn(err);
      //       next(err);
      //       return;
      //     }

      //     next();
      //   });

      this.io.on('connection', (socket) => {
        console.log('socket connection computer', socket);
        const address = socket.handshake.address;
        const user = socket.decoded_token || {};

        // Add to the socket pool
        this.sockets.push(socket);

        socket.on('disconnect', () => {
          log.debug(`Disconnected from ${address}: id=${socket.id}, user.id=${user.id}, user.name=${user.name}`);
        });

        // Open serial port
        socket.on('open', (espPort, port, callback = noop) => {
          console.log(espPort, port);
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.open("${JSON.stringify(port)}", esp port ${JSON.stringify(espPort)}): id=${socket.id}`);

          if (this.computerConnection && this.computerConnection.isOpen) {
            log.error('Cannot open computer connection port ');
            socket.join(port);
            callback(null);
            return;
          }

          const espController = store.get('controllers["' + espPort.port + '"]');
          if (!espController) {
            log.error('ESP Controller not found');
            return;
          }

          this.computerConnection = new SerialConnection({
            path: port.port,
            baudRate: 115200
          });

          this.computerConnection.open((err) => {
            if (err) {
              log.error(`Error opening serial port "${port.path}":`, err);
              return;
            }

            log.debug(`Connected to serial port "${port.path}"`);

            this.computerConnection.on('data', connectionEventListener.data);
            this.computerConnection.on('close', connectionEventListener.close);
            this.computerConnection.on('error', connectionEventListener.error);
            espController.connection.on('data', connectionEventListener.espData);

            const connectionEventListener = {
              data: (data) => {
                espController.command('gcode', data, (err, state) => {
                  if (err) {
                    socket.emit('computer:data-error', err);
                  }
                  socket.emit('computer:data-state', state);
                });
                socket.emit('computer:data', data);
              },
              close: (err) => {
                if (this.computerConnection) {
                  this.computerConnection = null;
                }
                socket.emit('computer:close', err);
              },
              error: (err) => {
                if (err) {
                  log.error(`Unexpected error while reading/writing serial port "${port}":`, err);
                  socket.emit('computer:error', err);
                }
              },
              espData: (data) => {
                espController.command('gcode', data, (err, state) => {
                  this.computerConnection.write(data + '\n');
                });
                socket.emit('computer:espData', data);
              },
            };
          });
        });

        // Close serial port
        socket.on('close', (port, callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          if (!this.computerConnection) {
            const err = `Serial port "${this.computerConnection.port}" is not available`;
            console.log(err);
            return;
          }

          if (!(this.computerConnection && this.computerConnection.isOpen)) {
            return;
          }

          this.computerConnection.close();

          // Leave the room
          socket.leave(port);

          this.computerConnection.removeAllListeners();
          this.computerConnection.close();
        });
      });
    }
}

export default ComputerConnection;
