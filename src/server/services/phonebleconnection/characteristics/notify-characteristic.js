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

  sendNotification(data) {
    console.log(data);
    if (this.isSubscribed && this.updateValueCallback && data != null) {
      const data = Buffer.from(data);
      this.updateValueCallback(data);
    }
  }
}

module.exports = NotifyCharacteristic;
