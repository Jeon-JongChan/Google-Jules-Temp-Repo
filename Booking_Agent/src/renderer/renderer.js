document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('url-input');
  const siteSelect = document.getElementById('site-select');
  const seatPreference = document.getElementById('seat-preference');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const terminal = document.getElementById('log-terminal');

  function appendLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    terminal.appendChild(entry);
    terminal.scrollTop = terminal.scrollHeight;
  }

  startBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      appendLog('URL을 입력해주세요.', 'error');
      return;
    }

    const config = {
      url: url,
      site: siteSelect.value,
      seatPreference: seatPreference.value
    };

    startBtn.disabled = true;
    stopBtn.disabled = false;
    appendLog('작업을 시작합니다...', 'system');

    // IPC 통신을 통해 메인 프로세스로 작업 요청
    if (window.electronAPI) {
      window.electronAPI.startAutomation(config);
    } else {
      appendLog('Electron API를 사용할 수 없습니다.', 'error');
      resetUI();
    }
  });

  stopBtn.addEventListener('click', () => {
    appendLog('작업 중지 요청...', 'system');
    if (window.electronAPI) {
      window.electronAPI.stopAutomation();
    }
    resetUI();
  });

  function resetUI() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  // 메인 프로세스로부터 로그 메시지 수신
  if (window.electronAPI) {
    window.electronAPI.onLogMessage((event, data) => {
      appendLog(data.message, data.type);
    });

    window.electronAPI.onAutomationStopped((event) => {
      appendLog('자동화 프로세스가 종료되었습니다.', 'system');
      resetUI();
    });
  }
});
