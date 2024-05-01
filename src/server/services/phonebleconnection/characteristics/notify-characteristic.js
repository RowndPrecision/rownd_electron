const bleno = require('bleno');
const { Buffer } = require('buffer');
const bleEventEmitter = require('../event-emitter');

class NotifyCharacteristic extends bleno.Characteristic {
  constructor(uuid) {
    super({
      uuid,
      properties: ['notify'],
    });

    this.onDataReceived = this.onDataReceived.bind(this);
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
    bleEventEmitter.off('phoneble-esp:data', this.onDataReceived);
  }

  onDataReceived(data) {
    if (data) {
      const bufferData = Buffer.from(data);
      this.updateValueCallback && this.updateValueCallback(bufferData);
    }
  }
}

module.exports = NotifyCharacteristic;
