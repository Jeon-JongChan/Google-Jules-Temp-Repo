const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class BrowserFacade {
  constructor(sendLog) {
    this.sendLog = sendLog;
    this.browserContext = null;
    this.page = null;
    this.userDataDir = null; // app.getPath('userData')에서 초기화됨
  }

  setUserDataDir(dir) {
    this.userDataDir = path.join(dir, 'playwright_session');
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
  }

  async launch() {
    try {
      // 기존 세션/프로세스가 있다면 확실히 정리 (P1-3)
      await this.close();

      this.sendLog('브라우저를 시작합니다...', 'system');

      const launchOptions = {
        headless: false,
      };

      // 사용자 데이터 디렉토리 설정 (P1-4: 보안 및 영속성 강화)
      if (!this.userDataDir) {
          // Fallback (테스트 등에서 초기화 안 된 경우)
          const os = require('os');
          this.userDataDir = path.join(os.tmpdir(), 'booking_agent_fallback_session');
      }

      this.browserContext = await chromium.launchPersistentContext(this.userDataDir, launchOptions);

      const pages = this.browserContext.pages();
      this.page = pages.length > 0 ? pages[0] : await this.browserContext.newPage();

      this.page.on('pageerror', error => this.sendLog(`[페이지 에러] ${error.message}`, 'error'));

      return this.page;
    } catch (error) {
      this.sendLog(`브라우저 시작 실패: ${error.message}`, 'error');
      throw error;
    }
  }

  async bringToFront() {
    if (this.page && !this.page.isClosed()) {
      this.sendLog('결제창/대상 창을 최상단으로 활성화합니다.', 'success');
      try {
        await this.page.bringToFront();
      } catch(e) {
        // 이미 닫힌 창 등 무시
      }
    }
  }

  async close() {
    try {
      if (this.browserContext) {
        this.sendLog('브라우저 컨텍스트를 종료하고 정리합니다.', 'system');
        await this.browserContext.close();
      }
    } catch (error) {
      this.sendLog(`브라우저 종료 중 오류: ${error.message}`, 'error');
    } finally {
      this.browserContext = null;
      this.page = null;
    }
  }
}

module.exports = { BrowserFacade };
