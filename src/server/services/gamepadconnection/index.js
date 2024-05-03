import GamepadConnection from './GamepadConnection';

const gamepadconnection = new GamepadConnection();

const start = (server) => {
  gamepadconnection.start(server);
};

const stop = () => {
  gamepadconnection.stop();
};

export default {
  start,
  stop
};
