// ※ 주석: 각 예매 사이트의 DOM 구조(로그인/예매 버튼/좌석)는 캡차, 보안 팝업, 잦은 리뉴얼 등으로 인해 완벽한 실측이 불가하여 추측성(휴리스틱) 선택자를 사용했습니다.
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
