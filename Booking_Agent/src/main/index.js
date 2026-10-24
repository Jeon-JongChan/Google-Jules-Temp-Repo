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

  const sendLog = (message, type = 'info') => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-message', { message, type });
    }
  };

  automationService = new AutomationService(sendLog);
  // P1-4: OS 임시 폴더 대신 Electron의 사용자 데이터 폴더 사용
  automationService.setUserDataDir(app.getPath('userData'));
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
    // 브라우저 닫기 및 로직 정리가 모두 끝난 후 renderer로 완료 신호 전송 (P1-3)
    event.sender.send('automation-stopped');
  }
});
