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

  // URL 유효성 검사 추가 (P2-2 반영)
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  startBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      appendLog('URL을 입력해주세요.', 'error');
      return;
    }
    if (!isValidUrl(url)) {
      appendLog('유효하지 않은 URL 형식입니다. http:// 또는 https:// 로 시작하는 전체 URL을 입력하세요.', 'error');
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

    if (window.electronAPI) {
      window.electronAPI.startAutomation(config);
    } else {
      appendLog('Electron API를 사용할 수 없습니다.', 'error');
      resetUI();
    }
  });

  stopBtn.addEventListener('click', () => {
    appendLog('작업 중지 요청...', 'system');
    stopBtn.disabled = true; // 중지 버튼 연속 클릭 방지
    if (window.electronAPI) {
      window.electronAPI.stopAutomation();
    }
  });

  function resetUI() {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  if (window.electronAPI) {
    window.electronAPI.onLogMessage((event, data) => {
      appendLog(data.message, data.type);
    });

    window.electronAPI.onAutomationStopped((event) => {
      appendLog('자동화 프로세스가 완전히 종료되었습니다.', 'system');
      resetUI(); // 메인 프로세스에서 종료 처리가 완전히 끝난 후에만 시작 버튼 활성화 (P1-3 반영)
    });
  }
});
