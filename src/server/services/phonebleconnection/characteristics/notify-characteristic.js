const bleno = require('bleno');
const { Buffer } = require('buffer');
const bleEventEmitter = require('../event-emitter');

class NotifyCharacteristic extends bleno.Characteristic {
  constructor(uuid) {
    super({
      uuid,
      properties: ['notify'],
    });
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    console.log('NotifyCharacteristic - onSubscribe');

    this.isSubscribed = true;
    this.updateValueCallback = updateValueCallback;

    bleEventEmitter.on('phoneble-esp:data', this.onDataReceived);
  }

  onUnsubscribe() {
    console.log('NotifyCharacteristic - onUnsubscribe');
    this.updateValueCallback = null;
    bleEventEmitter.removeListener('phoneble-esp:data', this.onDataReceived);
  }

  onDataReceived(data) {
    console.log(data, this.updateValueCallback, 'this.updateValueCallback');
    if (data) {
      const bufferData = Buffer.from(data);
      this.updateValueCallback && this.updateValueCallback(bufferData);
    }
  }
}

module.exports = NotifyCharacteristic;
