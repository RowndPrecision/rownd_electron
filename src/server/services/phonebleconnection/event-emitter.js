const EventEmitter = require('events');

class PhoneBLEEventEmitter extends EventEmitter {}

module.exports = new PhoneBLEEventEmitter();
