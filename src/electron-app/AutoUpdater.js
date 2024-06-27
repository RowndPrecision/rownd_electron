/* eslint import/no-unresolved: 0 */
import { autoUpdater, BrowserWindow } from 'electron';
import os from 'os';
import log from './log';

const notify = (title, message) => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    return;
  }

  windows[0].webContents.send('notify', title, message);
};

class AutoUpdater {
  constructor(window) {
    // if (process.platform !== 'darwin') {
    //   return;
    // }

    autoUpdater.addListener('update-available', (event) => {
      log.debug('A new update is available');
    });
    // On Windows only `releaseName` is available.
    autoUpdater.addListener('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {
      const title = 'A new update is ready to install';
      const message = `Version ${releaseName} is downloaded and will be automatically installed on quit`;
      notify(title, message);
    });
    autoUpdater.addListener('error', (err) => {
      console.log(err, 'auto updater error');
    });
    autoUpdater.addListener('checking-for-update', () => {
      console.log('checking-for-update');
    });
    autoUpdater.addListener('update-not-available', () => {
      console.log('update-not-available');
    });

    const updateServerHost = 'rownd-electron-update-server-rownd-precision.vercel.app';
    const platform = os.platform();
    const arch = os.arch();
    const version = '1.0.7';
    const feedURL = `https://${updateServerHost}/update/${platform}-${arch}/${version}`;
    console.log(feedURL, 'feed url');
    autoUpdater.setFeedURL(feedURL);

    window.webContents.once('did-frame-finish-load', (event) => {
      autoUpdater.checkForUpdates();
    });
  }
}

export default AutoUpdater;
