// ※ 미검증: 실측 결과 DOM 구조 변동 또는 보호 기능 등으로 100% 검증되지 않았으며 일부 구조만 참고했습니다.
const { TicketStrategy } = require('./TicketStrategy');

class NtokStrategy extends TicketStrategy {
  getSiteName() {
    return '국립극장';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_area a[href*="logout"], .logout-btn'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a.btn_reservation, .ticket_btn_area .btn_red');
      return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'a.btn_reservation, .ticket_btn_area .btn_red';
  }
}
module.exports = { NtokStrategy };
