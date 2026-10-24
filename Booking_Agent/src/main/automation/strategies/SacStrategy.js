const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class SacStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[예술의전당] 예매 모니터링을 시작합니다.', 'info');
    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });

      let isLoggedIn = false;
      for (let i = 0; i < 30; i++) {
        if (!this.isMonitoring) return;
        isLoggedIn = await this.page.evaluate(() => !!document.querySelector('a.logout, .header-login-out'));
        if (isLoggedIn) {
            this.sendLog('로그인 확인 완료! 예매 버튼 감시 시작.', 'success');
            break;
        }
        if (i === 0) this.sendLog('로그인이 필요합니다. 직접 로그인해주세요. (예술의전당)', 'info');
        await this.delay(1000);
      }

      let attempt = 0;
      while (this.isMonitoring && attempt < 60) {
        attempt++;
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('button.btn_ticketing, a.btn-ticketing, .btnWrap .btnBook');
          return btn && !btn.classList.contains('disabled');
        });
        if (isButtonActive) {
          this.sendLog('예술의전당 예매 버튼 활성화 감지! 클릭 시도...', 'success');
          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click('button.btn_ticketing, a.btn-ticketing, .btnWrap .btnBook');
          let targetPage = (await popupPromise) || this.page;
          await targetPage.waitForLoadState('domcontentloaded');
          await targetPage.waitForTimeout(3000);

          const seatSuccess = await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, '예술의전당');
          if (seatSuccess) this.sendLog('자동화 단계 완료. 사용자 결제를 대기합니다.', 'success');
          else this.sendLog('좌석 선택에 실패했거나 Canvas 등 미지원 구조입니다. 수동 예매를 진행해 주세요.', 'error');
          break;
        }
        await this.delay(3000 + (attempt * 100) + Math.floor(Math.random() * 500));
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }
    } catch (error) {
      if(this.isMonitoring) this.sendLog(`예술의전당 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { SacStrategy };
