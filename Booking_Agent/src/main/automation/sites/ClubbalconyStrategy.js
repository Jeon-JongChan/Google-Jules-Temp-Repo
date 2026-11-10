// ※ 주석: 각 예매 사이트의 DOM 구조(로그인/예매 버튼/좌석)는 캡차, 보안 팝업, 잦은 리뉴얼 등으로 인해 완벽한 실측이 불가하여 추측성(휴리스틱) 선택자를 사용했습니다.
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
