const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class LotteStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[Lotte] 예매 모니터링을 시작합니다.', 'info');

    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });

      this.sendLog('페이지 로드 완료. (로그인이 필요한 경우 지금 진행해주세요. 15초 대기)', 'system');
      await this.delay(15000); // 사용자 로그인 대기

      while (this.isMonitoring) {
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('a.btn_reserve, button.btn_reserve, .btn-ticketing, .btn_reservation, .btn_buy');
          return btn && getComputedStyle(btn).display !== 'none' && !btn.disabled && !btn.classList.contains('disabled');
        });

        if (isButtonActive) {
          this.sendLog('Lotte 예매 활성화 감지! 클릭 시도...', 'success');

          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click('a.btn_reserve, button.btn_reserve, .btn-ticketing, .btn_reservation, .btn_buy');

          this.sendLog('예매창/팝업 대기 중...', 'info');
          const popupPage = await popupPromise;
          let targetPage = popupPage || this.page;
          await targetPage.waitForLoadState('domcontentloaded');

          this.sendLog('예매창 진입 완료. DOM 렌더링 대기...', 'info');
          await targetPage.waitForTimeout(3000);

          await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, 'Lotte');

          this.sendLog('자동화 단계 완료. 사용자 결제를 대기합니다.', 'success');
          break;
        }

        await this.delay(3000);
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }

      if (this.isMonitoring) {
          this.sendLog('결제가 완료될 때까지 대기합니다. (직접 결제 진행 요망)', 'system');
      }
    } catch (error) {
      if(this.isMonitoring) this.sendLog(`Lotte 자동화 중 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { LotteStrategy };
