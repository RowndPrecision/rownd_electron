import espController from 'app/lib/controller';
import { GAMEPAD_BUTTONS, GAMEPAD_STICK_AXES } from '../../../constants';

const EventEmitter = require('events');

class GamepadConnection extends EventEmitter {
  buttons = [];

  controllerIndex = null;

  lastCallTime = Date.now();

  debounceDelay = Math.floor(1000 / 15)

  start() {
    window.addEventListener('gamepadconnected', this.handleConnect);
    window.addEventListener('gamepaddisconnected', this.handleDisconnect);
  }

  stop() {
    window.removeEventListener('gamepadconnected', this.handleConnect);
    window.removeEventListener('gamepaddisconnected', this.handleDisconnect);
  }

  handleConnect = (event) => {
    this.controllerIndex = event.gamepad.index;
    this.startGameLoop();
    this.emit('gamepad:connect', event.gamepad);
  };

  handleDisconnect = (event) => {
    if (this.controllerIndex === event.gamepad.index) {
      this.controllerIndex = null;
      cancelAnimationFrame(this.gameLoopId);
      this.emit('gamepad:disconnect', event.gamepad);
    }
  };

  handleButtons = (buttons) => {
    // Initialize or update stored button values
    if (!this.buttons || this.buttons.length !== buttons.length) {
      this.buttons = buttons.map(button => button.value);
      return;
    }

    // Iterate over the buttons and handle changes
    buttons.forEach((button, index) => {
      const prevValue = this.buttons[index];

      // Skip if the button's value hasn't changed or isn't pressed
      if (!(button.value !== prevValue && (button.pressed || button.value !== 0))) {
        return;
      }

      // Define the button command mapping
      const buttonCommands = {
        4: GAMEPAD_BUTTONS.FEEDRATE_DECREASE,
        5: GAMEPAD_BUTTONS.FEEDRATE_INCREASE,
        14: GAMEPAD_BUTTONS.MOVE_X_DECREASE,
        15: GAMEPAD_BUTTONS.MOVE_X_INCREASE,
        12: GAMEPAD_BUTTONS.MOVE_Z_INCREASE,
        13: GAMEPAD_BUTTONS.MOVE_Z_DECREASE,
        1: GAMEPAD_BUTTONS.CIRCLE,
        2: GAMEPAD_BUTTONS.SQUARE,
        3: GAMEPAD_BUTTONS.TRIANGLE,
        0: GAMEPAD_BUTTONS.CROSS,
        6: GAMEPAD_BUTTONS.SPEED_DECREASE,
        7: GAMEPAD_BUTTONS.SPEED_INCREASE
      };

      // Get the corresponding button name from the mapping
      const buttonName = buttonCommands[index];

      // Execute the command if a valid button name was found
      if (buttonName) {
        espController.command('gamepad:button-command', buttonName, button.value);
      }
    });

    // Update the stored button values
    this.buttons = buttons.map(button => button.value);
  };

  handleSticks = (axes) => {
    const cAxe = axes[1];
    const xAxe = axes[2];
    const zAxe = axes[3];

    espController.command('gamepad:stick-axes-command', {
      [GAMEPAD_STICK_AXES.X]: xAxe,
      [GAMEPAD_STICK_AXES.Z]: zAxe,
      [GAMEPAD_STICK_AXES.C]: cAxe,
    });
  };

  gameLoop = () => {
    if (this.controllerIndex !== null) {
      const gamepad = navigator.getGamepads()[this.controllerIndex];
      if (gamepad) {
        this.handleButtons(gamepad.buttons);
        this.handleSticks(gamepad.axes);
      }
    }
    this.gameLoopId = requestAnimationFrame(this.gameLoop);
  };

  startGameLoop = () => {
    this.gameLoopId = requestAnimationFrame(this.gameLoop);
  };
}

export default GamepadConnection;
