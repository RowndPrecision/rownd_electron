/* eslint import/no-unresolved: 0 */
import { BrowserWindow, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

import log from './log';

log.transports.file.level = 'info';
log.transports.console.level = 'info';

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

const notify = (title, message) => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    return;
  }

  windows[0].webContents.send('notify', title, message);
};

class AutoUpdater {
  constructor(window) {
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: 'A new version has been downloaded. Restart the application to apply the updates.'
      };

      dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let message = 'Download speed: ' + progressObj.bytesPerSecond;
      message = message + ' - Downloaded ' + progressObj.percent + '%';
      message = message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
      notify(message);
    });

    autoUpdater.on('error', (err) => {
      notify('Error in auto-updater:', err);
    });

    // const updateServerHost = 'rownd-electron-update-server-rownd-precision.vercel.app';
    // const platform = os.platform();
    // const arch = os.arch();
    // const version = '1.0.7';
    // const feedURL = `https://${updateServerHost}/update/${platform}-${arch}/${version}`;
    // console.log(feedURL, 'feed url');
    // autoUpdater.setFeedURL(feedURL);

    window.webContents.once('did-frame-finish-load', (event) => {
      autoUpdater.checkForUpdatesAndNotify();
    });

    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 900000);
  }
}

export default AutoUpdater;
