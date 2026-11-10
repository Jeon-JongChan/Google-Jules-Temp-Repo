// ※ 미검증: 봇 차단, 리액트 SPA 지연, 파라미터 제약 등으로 실제 페이지 기반 실측 불가. 추측성 코드가 포함되어 있습니다.
const { TicketStrategy } = require('./TicketStrategy');

class SejongStrategy extends TicketStrategy {
  getSiteName() {
    return '세종문화회관';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_list .logout, a[href*="logout.do"]'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a.btn_reserve, button.btn-reserve, .perform-btn-box .btn_red');
      return btn && !btn.classList.contains('disabled') && !btn.disabled;
    });
  }

  getBookingButtonSelector() {
    return 'a.btn_reserve, button.btn-reserve, .perform-btn-box .btn_red';
  }
}
module.exports = { SejongStrategy };
