// ※ 미검증: 봇 차단, 리액트 SPA 지연, 파라미터 제약 등으로 실제 페이지 기반 실측 불가. 추측성 코드가 포함되어 있습니다.
const { TicketStrategy } = require('./TicketStrategy');

class LivenationStrategy extends TicketStrategy {
  getSiteName() {
    return '라이브네이션';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('a.logout, .user-nav .sign-out'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a.buy-tickets-button, a.btn-buy, .ticket-wrap .buy-btn');
      return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'a.buy-tickets-button, a.btn-buy, .ticket-wrap .buy-btn';
  }
}
module.exports = { LivenationStrategy };
