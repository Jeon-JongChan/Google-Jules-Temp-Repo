// ※ 미검증: 봇 차단, 리액트 SPA 지연, 파라미터 제약 등으로 실제 페이지 기반 실측 불가. 추측성 코드가 포함되어 있습니다.
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
