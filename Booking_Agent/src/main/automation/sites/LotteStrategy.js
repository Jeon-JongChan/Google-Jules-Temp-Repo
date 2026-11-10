// ※ 미검증: 실측 결과 DOM 구조 변동 또는 보호 기능 등으로 100% 검증되지 않았으며 일부 구조만 참고했습니다.
const { TicketStrategy } = require('./TicketStrategy');

class LotteStrategy extends TicketStrategy {
  getSiteName() {
    return '롯데콘서트홀';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.header .logout, a[href*="logout"]'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('button.btn_reserve, a.btn_reserve, .btn-group .book-btn');
      return btn && !btn.disabled && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'button.btn_reserve, a.btn_reserve, .btn-group .book-btn';
  }
}
module.exports = { LotteStrategy };
