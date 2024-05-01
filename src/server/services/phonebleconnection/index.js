import PhoneBLEConnection from './PhoneBLEConnection';

const phonebleconnection = new PhoneBLEConnection();

const start = (server) => {
  phonebleconnection.start(server);
};

const stop = () => {
  phonebleconnection.stop();
};

export default {
  start,
  stop
};
