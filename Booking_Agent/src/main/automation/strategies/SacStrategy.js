const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class SacStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[예술의전당] 예매 모니터링을 시작합니다.', 'info');
    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
      for (let i = 0; i < 20; i++) { if(!this.isMonitoring) return; await this.delay(1000); }
      let attempt = 0;
      while (this.isMonitoring && attempt < 60) {
        attempt++;
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('button.btn_ticketing, a.btn_ticketing');
          return btn && !btn.classList.contains('disabled');
        });
        if (isButtonActive) {
          this.sendLog('예술의전당 예매 버튼 활성화 감지!', 'success');
          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click('button.btn_ticketing, a.btn_ticketing');
          let targetPage = (await popupPromise) || this.page;
          await targetPage.waitForTimeout(3000);
          await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, 'sac');
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
