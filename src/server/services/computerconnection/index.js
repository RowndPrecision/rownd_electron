import ComputerConnection from './ComputerConnection';

const computerConnection = new ComputerConnection();

const start = (server) => {
  computerConnection.start(server);
};

const stop = () => {
  computerConnection.stop();
};

export default {
  start,
  stop
};
