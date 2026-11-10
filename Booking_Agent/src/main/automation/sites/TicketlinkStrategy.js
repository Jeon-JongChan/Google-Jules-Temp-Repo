// ※ 미검증: Cloudflare 봇 차단 및 접속 무한 대기 문제(Timeout)로 인해 헤드리스/일반 브라우저 모두에서 DOM 확보 실패
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
