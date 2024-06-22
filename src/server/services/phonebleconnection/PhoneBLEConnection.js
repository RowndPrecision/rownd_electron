
import noop from 'lodash/noop';
import socketIO from 'socket.io';
import socketioJwt from 'socketio-jwt';
import settings from '../../config/settings';
import logger from '../../lib/logger';
import store from '../../store';
import {
  authorizeIPAddress,
  validateUser
} from '../../access-control';

const bleno = require('@abandonware/bleno');
const fs = require('fs');
const bleEventEmitter = require('./event-emitter');

const BlenoPrimaryService = bleno.PrimaryService;

// Constants for the service and characteristic UUIDs
const SERVICE_UUID = '27cf08c1-076a-41af-becd-02ed6f6109b9';
const READ_CHARACTERISTIC_UUID = 'a81d2e68-6b9a-4d24-bf0e-ee829f09b311';
const WRITE_CHARACTERISTIC_UUID = 'ed50d118-53fd-4dc2-88b0-3c07f5a2a89a';
const NOTIFY_CHARACTERISTIC_UUID = 'de2f08e3-f66c-4825-91e8-ace63bafed3d';

const ReadCharacteristic = require('./characteristics/read-characteristic');
const WriteCharacteristic = require('./characteristics/write-characteristic');
const NotifyCharacteristic = require('./characteristics/notify-characteristic');

const readCharacteristic = new ReadCharacteristic(READ_CHARACTERISTIC_UUID);
const writeCharacteristic = new WriteCharacteristic(WRITE_CHARACTERISTIC_UUID);
const notifyCharacteristic = new NotifyCharacteristic(
  NOTIFY_CHARACTERISTIC_UUID,
);

const log = logger('service:phonebleconnection');

class PhoneBLEConnection {
    server = null;

    io = null;

    espController = null;

    socket = null;

    espPort = null;

    eventListener = {
      stateChange: (state) => {
        console.log(`on -> stateChange: ${state}, address = ${bleno.address}`);

        if (state === 'poweredOn') {
          console.log('request startAdvertising');
          bleno.startAdvertising('Rownd', [SERVICE_UUID]);
        } else {
          console.log('request stopAdvertising');
          bleno.stopAdvertising();
        }
      },
      advertisingStart: (error) => {
        console.log(
          `on -> advertisingStart: ${error ? `error ${error}` : 'success'}`,
        );

        if (!error) {
          bleno.setServices([
            new BlenoPrimaryService({
              uuid: SERVICE_UUID,
              characteristics: [
                readCharacteristic,
                writeCharacteristic,
                notifyCharacteristic,
              ],
            }),
          ]);
        }
      },
      advertisingStartError: (error) => {
        console.log('advertisingStartError:', error);
      },
      advertisingStop: () => {
        console.log('advertisingStop');
      },
      mtuChange: (mtu) => {
        console.log('mtuChange:', mtu);
      },
      servicesSet: (error) => {
        console.log(`on -> servicesSet: ${error ? `error ${error}` : 'success'}`);
      },
      servicesSetError: (error) => {
        console.log('servicesSetError:', error);
      },
      accept: (clientAddress) => {
        this.socket.emit('phoneble:connect', clientAddress);
        console.log(`on -> accept, client: ${clientAddress}`);
        bleno.updateRssi();
      },
      disconnect: (clientAddress) => {
        console.log(`on -> disconnect, client: ${clientAddress}`);
        this.socket.emit('phoneble:disconnect', clientAddress);
      },
      rssiUpdate: (rssi) => {
        console.log(`on -> rssiUpdate: ${rssi}`);
      },
      espData: (data) => {
        bleEventEmitter.emit('phoneble-esp:data', data);
      },
      writeRequestReceived: (data) => {
        if (data.coordinates) {
          const { x, y } = data.coordinates;
          const defaultSpeed = 200;
          const gCodeCommand = `$J = G21G91F${defaultSpeed}X${x}Z${y}`;
          this.sendCommandToESP(gCodeCommand);
        }
        if (data.filePath) {
          const { filePath } = data;
          this.sendGCodeFileToESP(filePath);
        }
      }
    };

    start(server) {
      this.server = server;
      this.io = socketIO(this.server, {
        serveClient: true,
        path: '/phoneble-socket.io'
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
        socket.on('open', (espPort, callback = noop) => {
          if (typeof callback !== 'function') {
            callback = noop;
          }

          log.debug(`socket.open("bleno connection, esp port ${JSON.stringify(espPort)}): id=${socket.id}`);

          this.espPort = espPort;

          this.espController = store.get('controllers["' + espPort.port + '"]');
          if (!this.espController) {
            log.error('ESP Controller not found');
            callback(null);
          }

          this.open();

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
      bleno.on('stateChange', this.eventListener.stateChange);
      bleno.on('accept', this.eventListener.accept);
      bleno.on('mtuChange', this.eventListener.mtuChange);
      bleno.on('disconnect', this.eventListener.disconnect);
      bleno.on('advertisingStart', this.eventListener.advertisingStart);
      bleno.on('advertisingStartError', this.eventListener.advertisingStartError);
      bleno.on('advertisingStop', this.eventListener.advertisingStop);
      bleno.on('servicesSet', this.eventListener.servicesSet);
      bleno.on('servicesSetError', this.eventListener.servicesSetError);
      bleno.on('rssiUpdate', this.eventListener.rssiUpdate);
      bleEventEmitter.on('writeRequestReceived', this.eventListener.writeRequestReceived);
      this.espController.connection.on('data', this.eventListener.espData);
    }

    close() {
      bleno.disconnect();
      bleEventEmitter.off('writeRequestReceived', this.eventListener.writeRequestReceived);
    }

    sendCommandToESP(data) {
      this.espController.command('gcode', data, (err, state) => {
        this.socket.emit('phoneble-esp:sendcommandesp', data, err, state);
      });
    }

    sendGCodeFileToESP(filePath) {
      fs.readFile(filePath, 'utf8', (err, fileContent) => {
        if (err) {
          console.error('Dosya okunurken bir hata oluştu:', err);
          return;
        }

        const path = require('path');
        const fileName = path.basename(filePath);
        const context = {};

        this.espController.command('gcode:load', fileName, fileContent, context, (err, data) => {
          if (err) {
            log.error(err);
            return;
          }

          log.debug(data); // TODO
        });
      });
    }

    stop() {
      this.close();
    }
}

export default PhoneBLEConnection;
