// ※ 주석: 각 예매 사이트의 DOM 구조(로그인/예매 버튼/좌석)는 캡차, 보안 팝업, 잦은 리뉴얼 등으로 인해 완벽한 실측이 불가하여 추측성(휴리스틱) 선택자를 사용했습니다.
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class TicketStrategy {
  constructor(page, sendLog, config) {
    this.page = page;
    this.sendLog = sendLog;
    this.config = config;
    this.isMonitoring = false;
    this.abortController = new AbortController();
    this.page._abortController = this.abortController;
  }

  // Template Method Hook Methods
  getSiteName() { throw new Error('getSiteName() must be implemented'); }
  async checkLoginStatus() { throw new Error('checkLoginStatus() must be implemented'); }
  async isButtonActive() { throw new Error('isButtonActive() must be implemented'); }
  getBookingButtonSelector() { throw new Error('getBookingButtonSelector() must be implemented'); }

  // Template Method
  async execute() {
    this.isMonitoring = true;
    const siteName = this.getSiteName();
    this.sendLog(`[${siteName}] 예매 모니터링을 시작합니다.`, 'info');

    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });

      // 1. 로그인 확인 대기
      let isLoggedIn = false;
      for (let i = 0; i < 30; i++) {
        if (!this.isMonitoring) return;
        isLoggedIn = await this.checkLoginStatus();
        if (isLoggedIn) {
          this.sendLog('로그인 확인 완료! 예매 버튼 활성화를 감시합니다.', 'success');
          break;
        }
        if (i === 0) this.sendLog(`로그인이 필요합니다. 직접 로그인해주세요. (${siteName})`, 'info');
        await this.delay(1000);
      }

      if (!isLoggedIn && this.isMonitoring) {
        this.sendLog('로그인 상태를 확인할 수 없으나(비회원 예매 허용 등), 모니터링을 강제 시작합니다.', 'info');
      }

      // 2. 예매 버튼 활성화 감시 (Polling Loop)
      let maxAttempts = 60;
      let attempt = 0;
      let baseDelay = 3000;

      while (this.isMonitoring && attempt < maxAttempts) {
        attempt++;

        const isButtonActive = await this.isButtonActive();

        if (isButtonActive) {
          this.sendLog(`${siteName} 예매 버튼 활성화 감지! 클릭 시도...`, 'success');

          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click(this.getBookingButtonSelector());

          this.sendLog('예매 팝업/새 탭 대기 중...', 'info');
          const popupPage = await popupPromise;
          let targetPage = popupPage || this.page;
          await targetPage.waitForLoadState('domcontentloaded');

          this.sendLog('달력/회차 위젯의 복잡성으로 인해 자동화가 어렵습니다. 수동으로 날짜와 회차를 선택해 주세요.', 'info');
          await targetPage.waitForTimeout(3000);

          // 3. 좌석 선택 자동화
          const seatSuccess = await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, siteName);

          if (seatSuccess) {
            this.sendLog('자동화 단계 완료. 사용자 결제를 대기합니다.', 'success');
          } else {
            this.sendLog('좌석 선택에 실패했거나 Canvas 등 미지원 구조입니다. 수동 예매를 진행해 주세요.', 'error');
          }
          break; // Loop exit on success
        }

        // Backoff and Jitter
        let currentDelay = baseDelay + (attempt * 100);
        const jitter = Math.floor(Math.random() * 500);
        await this.delay(currentDelay + jitter);

        // Some sites might not need reloading, but default is to reload if button not active
        this.sendLog(`모니터링 중... (시도: ${attempt}/${maxAttempts})`, 'system');
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }

      if (attempt >= maxAttempts) {
          this.sendLog('최대 모니터링 시도 횟수를 초과하여 작업을 종료합니다.', 'error');
      }

      if (this.isMonitoring) {
          this.sendLog('결제 또는 직접 진행을 대기 중입니다.', 'system');
      }
    } catch (error) {
      if(this.isMonitoring) this.sendLog(`${siteName} 자동화 중 오류: ${error.message}`, 'error');
    }
  }

  async stop() {
    this.isMonitoring = false;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.sendLog('모니터링이 즉시 중지되었습니다.', 'system');
  }

  // 서버 부하 방지를 위한 유틸리티 함수
  async delay(ms) {
    return new Promise(resolve => {
      const timeoutId = setTimeout(resolve, ms);

      if (!this.abortController) {
        this.abortController = new AbortController();
      }

      this.abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        resolve();
      }, { once: true });
    });
  }
}

module.exports = { TicketStrategy };
