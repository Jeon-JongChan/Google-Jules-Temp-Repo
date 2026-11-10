// ※ 주석: 각 예매 사이트의 DOM 구조(로그인/예매 버튼/좌석)는 캡차, 보안 팝업, 잦은 리뉴얼 등으로 인해 완벽한 실측이 불가하여 추측성(휴리스틱) 선택자를 사용했습니다.
const { TicketStrategy } = require('./TicketStrategy');

class InterparkStrategy extends TicketStrategy {
  getSiteName() {
    return '인터파크 티켓';
  }

  async checkLoginStatus() {
    // (인터파크 예시: 로그아웃 버튼이나 특정 로그인된 유저 영역 감지)
    return await this.page.evaluate(() => {
        const logoutBtn = document.querySelector('a[href*="logout"], .btn_logout');
        const myPageBtn = document.querySelector('.btn_mypage');
        return !!(logoutBtn || myPageBtn); // 로그인 되어있으면 true
    });
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a.btn_reservation, .productWrapper .btn_reserve, a[data-check="true"]');
      return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'a.btn_reservation, .productWrapper .btn_reserve, a[data-check="true"]';
  }
}
module.exports = { InterparkStrategy };
