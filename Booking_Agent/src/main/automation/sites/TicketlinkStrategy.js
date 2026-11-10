// ※ 미검증: 봇 차단, 리액트 SPA 지연, 파라미터 제약 등으로 실제 페이지 기반 실측 불가. 추측성 코드가 포함되어 있습니다.
const { TicketStrategy } = require('./TicketStrategy');

class TicketlinkStrategy extends TicketStrategy {
  getSiteName() {
    return '티켓링크';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_area .logout, a[href*="logout"]'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a.btn_reserve, button.reserveBtn, .btn_booking');
      return btn && !btn.disabled && !btn.classList.contains('disabled') && getComputedStyle(btn).display !== 'none';
    });
  }

  getBookingButtonSelector() {
    return 'a.btn_reserve, button.reserveBtn, .btn_booking';
  }
}
module.exports = { TicketlinkStrategy };
