const { chromium } = require('playwright');

class BrowserFacade {
  constructor(sendLog) {
    this.sendLog = sendLog;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch() {
    try {
      this.sendLog('브라우저를 시작합니다...', 'system');

      // 일반 사용자가 단일 실행 파일(.exe)로 실행할 때를 대비하여 시스템에 설치된 브라우저(Chrome/Edge)를 사용하도록 유도
      const launchOptions = {
        headless: false,
        // channel: 'chrome' // 만약 Playwright 자체 브라우저 대신 시스템 Chrome을 사용하려면 이 옵션 활성화
      };

      this.browser = await chromium.launch(launchOptions);
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();

      // 페이지 에러 로깅
      this.page.on('pageerror', error => this.sendLog(`[페이지 에러] ${error.message}`, 'error'));

      return this.page;
    } catch (error) {
      this.sendLog(`브라우저 시작 실패: Playwright 브라우저를 찾을 수 없습니다. 시스템에 Chrome이 설치되어 있는지 확인하세요. (${error.message})`, 'error');
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
      if (this.browser) {
        this.sendLog('브라우저를 종료합니다.', 'system');
        await this.browser.close();
      }
    } catch (error) {
      this.sendLog(`브라우저 종료 중 오류: ${error.message}`, 'error');
    } finally {
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}

module.exports = { BrowserFacade };
