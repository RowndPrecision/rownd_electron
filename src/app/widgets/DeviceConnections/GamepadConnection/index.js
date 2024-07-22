import espController from 'app/lib/controller';

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
    if (!this.buttons || this.buttons.length !== buttons.length) {
      this.buttons = buttons.map(button => button.value);
      return;
    }

    buttons.forEach((button, index) => {
      const prevValue = this.buttons[index];
      if ((button.value !== prevValue) && (button.pressed || button.value !== 0)) {
        console.log(`Button ${index} changed to`, button.value);
        if (index === 6) {
          espController.command('gcode', 'M3 S' + button.value * 1000 * 3);
        }

        if (index === 7) {
          espController.command('gcode', 'M3');
          espController.command('gcode', 'M5');
        }
      }
    });

    // Update the stored button values
    this.buttons = buttons.map(button => button.value);
  };

  handleSticks = (axes) => {
    this.calculateAndSendGCode(axes);
  };

  calculateAndSendGCode = (axes) => {
    const now = Date.now();
    if (now - this.lastCallTime < this.debounceDelay) {
      // Eğer önceki çağrıdan itibaren yeterli süre geçmediyse fonksiyonu çağırmayın
      return;
    }

    this.lastCallTime = now;

    const xValue = axes[1] !== undefined ? axes[1].toFixed(4) * 1000 : null;
    const cValue = axes[3] !== undefined ? axes[3].toFixed(4) * 1000 : null;
    const zValue = axes[0] !== undefined ? axes[0].toFixed(4) * 1000 : null;

    const minThreshold = Math.abs(0.05) * 1000; // Eşik değeri sabiti

    let command = '$J=G21G91';
    let totalFeedRateSquared = 0; // Toplam besleme oranının karesi

    // X ekseni
    if (xValue !== null && Math.abs(xValue) > minThreshold) {
      const feedRateX = Math.abs(xValue);
      totalFeedRateSquared += feedRateX * feedRateX;
      command += `X${axes[1].toFixed(4) * -1}`;
    }

    // C ekseni
    if (cValue !== null && Math.abs(cValue) > minThreshold) {
      const feedRateC = Math.abs(cValue);
      totalFeedRateSquared += feedRateC * feedRateC;
      command += `C${axes[3].toFixed(4) * -1}`;
    }

    // Z ekseni
    if (zValue !== null && Math.abs(zValue) > minThreshold) {
      const feedRateZ = Math.abs(zValue);
      totalFeedRateSquared += feedRateZ * feedRateZ;
      command += `Z${axes[0].toFixed(4)}`;
    }

    const feedRateCurT = Math.sqrt(totalFeedRateSquared);
    if (feedRateCurT > 0) {
      command += `F${feedRateCurT}`;
      console.log(command);
      espController.command('gcode', command);
    }
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
