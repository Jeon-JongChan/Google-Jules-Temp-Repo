// ※ 주석: 각 예매 사이트의 DOM 구조(로그인/예매 버튼/좌석)는 캡차, 보안 팝업, 잦은 리뉴얼 등으로 인해 완벽한 실측이 불가하여 추측성(휴리스틱) 선택자를 사용했습니다.
const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class MelonStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[멜론티켓] 예매 모니터링을 시작합니다.', 'info');
    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
      let isLoggedIn = false;
      for (let i = 0; i < 30; i++) {
        if (!this.isMonitoring) return;
        isLoggedIn = await this.page.evaluate(() => !!document.querySelector('.util_logout, a[href*="logout"]'));
        if (isLoggedIn) break;
        if (i === 0) this.sendLog('로그인이 필요합니다.', 'info');
        await this.delay(1000);
      }
      let attempt = 0;
      while (this.isMonitoring && attempt < 60) {
        attempt++;
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('button#ticketReservation_Btn, .btn_ticketing');
          return btn && !btn.disabled && !btn.classList.contains('disabled');
        });
        if (isButtonActive) {
          this.sendLog('멜론티켓 예매 버튼 활성화 감지! 클릭 시도...', 'success');
          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click('button#ticketReservation_Btn, .btn_ticketing');
          const popupPage = await popupPromise;
          let targetPage = popupPage || this.page;
          await targetPage.waitForLoadState('domcontentloaded');
          await targetPage.waitForTimeout(3000);
          await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, 'melon');
          break;
        }
        await this.delay(3000 + (attempt * 100) + Math.floor(Math.random() * 500));
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }
    } catch (error) {
      if(this.isMonitoring) this.sendLog(`멜론티켓 자동화 중 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { MelonStrategy };
