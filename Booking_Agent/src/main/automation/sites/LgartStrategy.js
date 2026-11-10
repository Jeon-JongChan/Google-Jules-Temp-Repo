// ※ 미검증: 실측 결과 DOM 구조 변동 또는 보호 기능 등으로 100% 검증되지 않았으며 일부 구조만 참고했습니다.
const { TicketStrategy } = require('./TicketStrategy');

class LgartStrategy extends TicketStrategy {
  getSiteName() {
    return 'LG아트센터';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_list .logout'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('button.btn-ticketing, a.btn-ticketing, .detail-btn-wrap .reserve');
      return btn && !btn.disabled && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'button.btn-ticketing, a.btn-ticketing, .detail-btn-wrap .reserve';
  }
}
module.exports = { LgartStrategy };
