const bleno = require('bleno');
const { Buffer } = require('buffer');

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
    this.sendNotification();
  }

  onUnsubscribe() {
    console.log('NotifyCharacteristic - onUnsubscribe');
    this.isSubscribed = false;
    this.updateValueCallback = null;
  }

  sendNotification(messageParam) {
    if (this.isSubscribed && this.updateValueCallback && messageParam != null) {
      const data = Buffer.from(messageParam);
      this.updateValueCallback(data);
    }
  }
}

module.exports = NotifyCharacteristic;
