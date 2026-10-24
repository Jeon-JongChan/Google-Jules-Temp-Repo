const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class InterparkStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[인터파크 티켓] 예매 모니터링을 시작합니다.', 'info');

    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
      this.sendLog('페이지 로드 완료. 예매 버튼 활성화를 감시합니다.', 'info');

      while (this.isMonitoring) {
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('a.btn_reservation, .productWrapper .btn_reserve');
          return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
        });

        if (isButtonActive) {
          this.sendLog('인터파크 예매 버튼 활성화 감지! 클릭 시도...', 'success');
          await this.page.click('a.btn_reservation, .productWrapper .btn_reserve');

          this.sendLog('예매창/팝업 대기 중...', 'info');
          await this.delay(2000);

          await SeatSelectionUtil.selectSeatByPreference(this.page, this.sendLog, this.config.seatPreference);

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
      if(this.isMonitoring) this.sendLog(`인터파크 자동화 중 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { InterparkStrategy };
