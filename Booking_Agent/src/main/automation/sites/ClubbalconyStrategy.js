// ※ 미검증: 봇 차단, 리액트 SPA 지연, 파라미터 제약 등으로 실제 페이지 기반 실측 불가. 추측성 코드가 포함되어 있습니다.
const { TicketStrategy } = require('./TicketStrategy');

class ClubbalconyStrategy extends TicketStrategy {
  getSiteName() {
    return '클럽발코니';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.top_util .logout, a[href*="logout"]'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('button.btn_reserve, a.btn_ticketing, .btn_wrap .reservation');
      return btn && !btn.classList.contains('disabled') && !btn.disabled;
    });
  }

  getBookingButtonSelector() {
    return 'button.btn_reserve, a.btn_ticketing, .btn_wrap .reservation';
  }
}
module.exports = { ClubbalconyStrategy };
