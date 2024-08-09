import api from 'app/api';
import Anchor from 'app/components/Anchor';
import settings from 'app/config/settings';
import combokeys from 'app/lib/combokeys';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import without from 'lodash/without';
import isElectron from 'is-electron';
import Push from 'push.js';
import React, { PureComponent } from 'react';
import { Navbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { withRouter } from 'react-router-dom';
import semver from 'semver';
import QuickAccessToolbar from './QuickAccessToolbar';
import Progress from '../../components/Progress';

const releases = 'https://github.com/cncjs/cncjs/releases';

const newUpdateAvailableTooltip = () => {
  return (
    <Tooltip
      id="navbarBrandTooltip"
      style={{ color: '#fff' }}
    >
      <div>{i18n._('New update available')}</div>
    </Tooltip>
  );
};

class Header extends PureComponent {
    static propTypes = {
      ...withRouter.propTypes
    };

    state = this.getInitialState();

    actions = {
      requestPushPermission: () => {
        const onGranted = () => {
          this.setState({ pushPermission: Push.Permission.GRANTED });
        };
        const onDenied = () => {
          this.setState({ pushPermission: Push.Permission.DENIED });
        };
        // Note that if "Permission.DEFAULT" is returned, no callback is executed
        const permission = Push.Permission.request(onGranted, onDenied);
        if (permission === Push.Permission.DEFAULT) {
          this.setState({ pushPermission: Push.Permission.DEFAULT });
        }
      },
      checkForUpdates: async () => {
        try {
          const res = await api.getState();
          const { checkForUpdates } = res.body;

          if (checkForUpdates) {
            const res = await api.getLatestVersion();
            const { time, version } = res.body;

            this._isMounted && this.setState({
              latestVersion: version,
              latestTime: time
            });
          }
        } catch (res) {
          // Ignore error
        }
      },
      fetchCommands: async () => {
        try {
          const res = await api.commands.fetch({ paging: false });
          const { records: commands } = res.body;

          this._isMounted && this.setState({
            commands: commands.filter(command => command.enabled)
          });
        } catch (res) {
          // Ignore error
        }
      },
      runCommand: async (cmd) => {
        try {
          const res = await api.commands.run(cmd.id);
          const { taskId } = res.body;

          this.setState({
            commands: this.state.commands.map(c => {
              return (c.id === cmd.id) ? { ...c, taskId: taskId, err: null } : c;
            })
          });
        } catch (res) {
          // Ignore error
        }
      }
    };

    actionHandlers = {
      CONTROLLER_COMMAND: (event, { command }) => {
        // feedhold, cyclestart, homing, unlock, reset
        controller.command(command);
      }
    };

    controllerEvents = {
      'config:change': () => {
        this.actions.fetchCommands();
      },
      'task:start': (taskId) => {
        this.setState({
          runningTasks: this.state.runningTasks.concat(taskId)
        });
      },
      'task:finish': (taskId, code) => {
        const err = (code !== 0) ? new Error(`errno=${code}`) : null;
        let cmd = null;

        this.setState({
          commands: this.state.commands.map(c => {
            if (c.taskId !== taskId) {
              return c;
            }
            cmd = c;
            return {
              ...c,
              taskId: null,
              err: err
            };
          }),
          runningTasks: without(this.state.runningTasks, taskId)
        });

        if (cmd && this.state.pushPermission === Push.Permission.GRANTED) {
          Push.create(cmd.title, {
            body: code === 0
              ? i18n._('Command succeeded')
              : i18n._('Command failed ({{err}})', { err: err }),
            icon: 'images/logo-badge-32x32.png',
            timeout: 10 * 1000,
            onClick: function () {
              window.focus();
              this.close();
            }
          });
        }
      },
      'task:error': (taskId, err) => {
        let cmd = null;

        this.setState({
          commands: this.state.commands.map(c => {
            if (c.taskId !== taskId) {
              return c;
            }
            cmd = c;
            return {
              ...c,
              taskId: null,
              err: err
            };
          }),
          runningTasks: without(this.state.runningTasks, taskId)
        });

        if (cmd && this.state.pushPermission === Push.Permission.GRANTED) {
          Push.create(cmd.title, {
            body: i18n._('Command failed ({{err}})', { err: err }),
            icon: 'images/logo-badge-32x32.png',
            timeout: 10 * 1000,
            onClick: function () {
              window.focus();
              this.close();
            }
          });
        }
      }
    };

    _isMounted = false;

    getInitialState() {
      let pushPermission = '';
      try {
        // Push.Permission.get() will throw an error if Push is not supported on this device
        pushPermission = Push.Permission.get();
      } catch (e) {
        // Ignore
      }

      return {
        pushPermission: pushPermission,
        commands: [],
        runningTasks: [],
        currentVersion: settings.version,
        latestVersion: settings.version,
        update: {
          available: false,
          downloaded: false,
          downloadProgress: null,
          error: null
        }
      };
    }

    componentDidMount() {
      this._isMounted = true;

      this.addActionHandlers();
      this.addControllerEvents();

      // Initial actions
      this.actions.checkForUpdates();
      this.actions.fetchCommands();

      if (isElectron()) {
        this.listenElectronUpdateCallbacks();
      }
    }

    componentWillUnmount() {
      this._isMounted = false;

      this.removeActionHandlers();
      this.removeControllerEvents();

      this.runningTasks = [];
    }

    addActionHandlers() {
      Object.keys(this.actionHandlers).forEach(eventName => {
        const callback = this.actionHandlers[eventName];
        combokeys.on(eventName, callback);
      });
    }

    removeActionHandlers() {
      Object.keys(this.actionHandlers).forEach(eventName => {
        const callback = this.actionHandlers[eventName];
        combokeys.removeListener(eventName, callback);
      });
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

    listenElectronUpdateCallbacks() {
      const { ipcRenderer } = window.require('electron');
      console.log('dinlemedeyim');

      ipcRenderer.on('update-available', (event, info) => {
        console.log('update-available');
        this.setState(state => ({
          update: {
            ...state.update,
            available: true,
          },
        }));
      });
      ipcRenderer.on('update-downloaded', (event, info) => {
        console.log('downloaded');
        this.setState(state => ({
          update: {
            ...state.update,
            downloaded: true,
          },
        }));
      });
      ipcRenderer.on('download-progress', (event, progressObj) => {
        console.log('progress');
        this.setState(state => ({
          update: {
            ...state.update,
            downloadProgress: progressObj,
          },
        }));
      });
      ipcRenderer.on('update-error', (event, err) => {
        console.log('error');
        this.setState(state => ({
          update: {
            ...state.update,
            error: err,
          },
        }));
      });
    }

    render() {
      const { location } = this.props;
      const { currentVersion, latestVersion, update } = this.state;
      const newUpdateAvailable = semver.lt(currentVersion, latestVersion);
      const tooltip = newUpdateAvailable ? newUpdateAvailableTooltip() : <div />;

      return (
        <Navbar
          fixedTop
          fluid
          inverse
          style={{
            border: 'none',
            margin: 0,
            backgroundColor: '#000',
            height: '40px'
          }}
        >
          <Navbar.Header>
            <OverlayTrigger
              overlay={tooltip}
              placement="right"
            >
              <Anchor
                className="navbar-brand"
                style={{
                  padding: 0,
                  position: 'relative',
                  height: 40,
                  width: 60
                }}
                href={releases}
                target="_blank"
                title={`${settings.productName} ${settings.version}`}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto' }}>
                  <img
                    style={{
                      margin: '10px 16px 8px'
                    }}
                    src="images/logo-badge-2x.png"
                    alt=""
                  />
                  <div style={{ color: 'white', fontSize: '10px', marginTop: '4px', width: '240px' }}>
                    { !update.error && update.available && update.downloadProgress && <p>Update Available & {Math.floor(update.downloadProgress.percent) < 100 ? 'Downloading..' : 'Downloaded.'}</p> }
                    { update.error && <p>Update Error</p> }
                    { !update.error && update.downloadProgress && <p style={{ marginTop: '-8px' }}><Progress min={0} max={100} now={Math.floor(update.downloadProgress.percent)} /></p> }
                  </div>
                </div>
              </Anchor>
            </OverlayTrigger>
            <Navbar.Toggle />
          </Navbar.Header>
          <Navbar.Collapse style={{ background: '#222222' }}>
            {location.pathname === '/workspace' &&
            <QuickAccessToolbar state={this.state} actions={this.actions} />
            }
          </Navbar.Collapse>
        </Navbar>
      );
    }
}

export default withRouter(Header);
