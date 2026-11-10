// ※ 미검증: STCLab SURFF 임시 접속 차단(봇 차단) 솔루션에 의해 접근이 막혀 정상적인 DOM 구조 획득 불가.
const { TicketStrategy } = require('./TicketStrategy');

class Yes24Strategy extends TicketStrategy {
  getSiteName() {
    return 'YES24 티켓';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.logout, a[href*="Logout"]'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a.btn_booking, a.btn_reservation');
      return btn && getComputedStyle(btn).display !== 'none';
    });
  }

  getBookingButtonSelector() {
    return 'a.btn_booking, a.btn_reservation';
  }
}
module.exports = { Yes24Strategy };
