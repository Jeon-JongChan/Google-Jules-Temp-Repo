const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { AutomationService } = require('./automation/AutomationService');

let mainWindow;
let automationService = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 로깅 함수: 렌더러의 터미널 창으로 전송
  const sendLog = (message, type = 'info') => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-message', { message, type });
    }
  };

  automationService = new AutomationService(sendLog);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.on('start-automation', async (event, config) => {
  if (automationService) {
    await automationService.start(config);
  }
});

ipcMain.on('stop-automation', async (event) => {
  if (automationService) {
    await automationService.stop();
    event.sender.send('automation-stopped');
  }
});
