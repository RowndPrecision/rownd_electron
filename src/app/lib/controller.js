import io from 'socket.io-client';
import Controller from './cncjs-controller/index';

const controller = new Controller(io);

export default controller;
