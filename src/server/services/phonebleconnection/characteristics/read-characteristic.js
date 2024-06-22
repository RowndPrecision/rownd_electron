const bleno = require('@abandonware/bleno');
const { Buffer } = require('buffer');

class ReadCharacteristic extends bleno.Characteristic {
  constructor(uuid) {
    super({
      uuid,
      properties: ['read'],
    });
  }

  onReadRequest(offset, callback) {
    console.log('ReadCharacteristic - onReadRequest');

    const data = Buffer.from('okuma'); // Hex value for decimal 42
    callback(this.RESULT_SUCCESS, data);
  }
}

module.exports = ReadCharacteristic;
