const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class TimeticketStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[Timeticket] 예매 모니터링을 시작합니다.', 'info');
    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
      for (let i = 0; i < 20; i++) { if(!this.isMonitoring) return; await this.delay(1000); }
      let attempt = 0;
      while (this.isMonitoring && attempt < 60) {
        attempt++;
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('.btn_reserve, .btn-ticketing, .btn_reservation, .buy-tickets-button, .btn_buy');
          return btn && !btn.classList.contains('disabled') && getComputedStyle(btn).display !== 'none';
        });
        if (isButtonActive) {
          this.sendLog('Timeticket 예매 버튼 활성화 감지!', 'success');
          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click('.btn_reserve, .btn-ticketing, .btn_reservation, .buy-tickets-button, .btn_buy');
          let targetPage = (await popupPromise) || this.page;
          await targetPage.waitForTimeout(3000);
          await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, 'Timeticket');
          break;
        }
        await this.delay(3000 + (attempt * 100) + Math.floor(Math.random() * 500));
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }
    } catch (error) {
      if(this.isMonitoring) this.sendLog(`Timeticket 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { TimeticketStrategy };
