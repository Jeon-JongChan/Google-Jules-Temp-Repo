const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

class BrowserFacade {
  constructor(sendLog) {
    this.sendLog = sendLog;
    this.browserContext = null;
    this.page = null;
  }

  async launch() {
    try {
      this.sendLog('브라우저를 시작합니다...', 'system');

      // 로그인이 유지되도록 persistent context(사용자 데이터 디렉토리) 사용
      const userDataDir = path.join(os.tmpdir(), 'booking_agent_playwright_data');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }

      const launchOptions = {
        headless: false,
        // channel: 'chrome' // 만약 Playwright 자체 브라우저 대신 시스템 Chrome을 사용하려면 이 옵션 활성화
      };

      this.browserContext = await chromium.launchPersistentContext(userDataDir, launchOptions);

      // 기존 열린 페이지가 있다면 사용, 없으면 생성
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
    if (this.page) {
      this.sendLog('결제창/대상 창을 최상단으로 활성화합니다.', 'success');
      await this.page.bringToFront();
    }
  }

  async close() {
    try {
      if (this.browserContext) {
        this.sendLog('브라우저를 종료합니다.', 'system');
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
