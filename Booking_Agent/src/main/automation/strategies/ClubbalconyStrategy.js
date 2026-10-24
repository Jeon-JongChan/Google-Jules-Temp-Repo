const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class ClubbalconyStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[클럽발코니] 예매 모니터링을 시작합니다.', 'info');

    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
      this.sendLog('페이지 로드 완료. 예매 버튼 활성화를 감시합니다.', 'info');

      while (this.isMonitoring) {
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('.btn_reserve, .btn_ticketing');
          return btn && !btn.classList.contains('disabled');
        });

        if (isButtonActive) {
          this.sendLog('클럽발코니 예매 버튼 활성화 감지! 클릭 시도...', 'success');
          await this.page.click('.btn_reserve, .btn_ticketing');

          this.sendLog('예매창 대기 중...', 'info');
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
      if(this.isMonitoring) this.sendLog(`클럽발코니 자동화 중 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { ClubbalconyStrategy };
