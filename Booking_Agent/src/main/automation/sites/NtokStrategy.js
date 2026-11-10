// ※ 주석: 각 예매 사이트의 DOM 구조(로그인/예매 버튼/좌석)는 캡차, 보안 팝업, 잦은 리뉴얼 등으로 인해 완벽한 실측이 불가하여 추측성(휴리스틱) 선택자를 사용했습니다.
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
