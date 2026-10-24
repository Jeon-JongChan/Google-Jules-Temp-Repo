const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class TicketlinkStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[티켓링크] 예매 모니터링을 시작합니다.', 'info');

    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });

      let isLoggedIn = false;
      for (let i = 0; i < 30; i++) {
        if (!this.isMonitoring) return;
        isLoggedIn = await this.page.evaluate(() => !!document.querySelector('.util_area .logout, a[href*="logout"]'));
        if (isLoggedIn) {
            this.sendLog('로그인 확인 완료! 예매 버튼 감시 시작.', 'success');
            break;
        }
        if (i === 0) this.sendLog('로그인이 필요합니다. 직접 로그인해주세요. (티켓링크)', 'info');
        await this.delay(1000);
      }

      let maxAttempts = 60;
      let attempt = 0;
      let baseDelay = 3000;

      while (this.isMonitoring && attempt < maxAttempts) {
        attempt++;
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('a.btn_reserve, button.reserveBtn, .btn_booking');
          return btn && !btn.disabled && !btn.classList.contains('disabled') && getComputedStyle(btn).display !== 'none';
        });

        if (isButtonActive) {
          this.sendLog('티켓링크 예매 버튼 활성화 감지! 클릭 시도...', 'success');

          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click('a.btn_reserve, button.reserveBtn, .btn_booking');

          this.sendLog('예매 팝업/새 탭 대기 중...', 'info');
          const popupPage = await popupPromise;
          let targetPage = popupPage || this.page;
          await targetPage.waitForLoadState('domcontentloaded');

          this.sendLog('달력/회차 선택 단계는 수동 진행이 필요합니다. 이후 좌석 선택 자동화 실행', 'info');
          await targetPage.waitForTimeout(3000);

          const seatSuccess = await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, 'ticketlink');
          if (seatSuccess) this.sendLog('자동화 단계 완료. 사용자 결제를 대기합니다.', 'success');
          else this.sendLog('좌석 선택에 실패했거나 Canvas 등 미지원 구조입니다. 수동 예매를 진행해 주세요.', 'error');
          break;
        }

        let currentDelay = baseDelay + (attempt * 100);
        await this.delay(currentDelay + Math.floor(Math.random() * 500));
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }
    } catch (error) {
      if(this.isMonitoring) this.sendLog(`티켓링크 자동화 중 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { TicketlinkStrategy };
