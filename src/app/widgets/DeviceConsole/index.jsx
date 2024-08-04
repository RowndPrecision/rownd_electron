import React, { PureComponent } from 'react';
//import PropTypes from 'prop-types';
import color from 'cli-color';
import controller from 'app/lib/controller';
import settings from 'app/config/settings';
// import i18n from 'app/lib/i18n';
import Console from './Console';
//import cx from 'classnames';
//import styles from './index.styl';

// The buffer starts with 254 bytes free. The terminating <LF> or <CR> counts as a byte.
const TERMINAL_COLS = 254;
const TERMINAL_ROWS = 15;

class DeviceConsole extends PureComponent {
    static propTypes = {
    };

    state = this.getInitialState();

    actions = {
      clearAll: () => {
        this.terminal && this.terminal.clear();
      },
      onTerminalData: (data) => {
        const context = {
          __sender__: this.senderId
        };
        controller.write(data, context);
      }
    };

      controllerEvents = {
        'serialport:open': (options) => {
          const { port } = options;
          this.setState({ port: port });
        },
        'serialport:close': (options) => {
          this.actions.clearAll();

          const initialState = this.getInitialState();
          this.setState({ ...initialState });
        },
        'serialport:write': (data, context) => {
          const { source, __sender__ } = { ...context };

          if (__sender__ === this.senderId) {
            // Do not write to the terminal console if the sender is the widget itself
            return;
          }

          if (!this.terminal) {
            return;
          }

          data = String(data).trim();

          if (source) {
            this.terminal.writeln(color.blackBright(source) + color.white(this.terminal.prompt + data));
          } else {
            this.terminal.writeln(color.white(this.terminal.prompt + data));
          }
        },
        'serialport:read': (data) => {
          if (!this.terminal) {
            return;
          }

          this.terminal.writeln(data);
        }
      };

      terminal = null;

      componentDidMount() {
        this.addControllerEvents();

        if (this.terminal) {
          const { productName, version } = settings;
          this.terminal.writeln(color.white.bold(`${productName} ${version} [${controller.type}]`));
          // this.terminal.writeln(color.white(i18n._('Connected to {{-port}} with a baud rate of {{baudrate}}', { port: color.yellowBright(port), baudrate: color.blueBright(baudrate) })));
        }
      }

      componentWillUnmount() {
        this.removeControllerEvents();
      }

      getInitialState() {
        return {
          port: controller.port,

          // Terminal
          terminal: {
            cols: TERMINAL_COLS,
            rows: TERMINAL_ROWS,
            cursorBlink: true,
            scrollback: 1000,
            tabStopWidth: 4
          }
        };
      }

      addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
          const callback = this.controllerEvents[eventName];
          controller.addListener(eventName, callback);
        });
      }

      removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
          const callback = this.controllerEvents[eventName];
          controller.removeListener(eventName, callback);
        });
      }

      render() {
        return (
          <Console
            ref={node => {
              if (node) {
                this.terminal = node.terminal;
              }
            }}
            state={this.state}
            actions={this.actions}
          />
        );
      }
}

export default DeviceConsole;
