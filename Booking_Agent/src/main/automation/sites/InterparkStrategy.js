const { TicketStrategy } = require('./TicketStrategy');

class InterparkStrategy extends TicketStrategy {
  getSiteName() {
    return '인터파크 티켓(NOL)';
  }

  async checkLoginStatus() {
    // NOL 실측 페이지(비회원 열람 가능)에서 명시적인 로그인/로그아웃 버튼이나 링크가 감지되지 않음.
    // 비회원 예매 진행이나 모니터링이 즉시 시작될 수 있도록 false를 반환하여 로직이 강제 모니터링을 타도록 하거나,
    // 로그인 체크 통과로 간주하기 위해 true를 반환. 여기서는 true로 반환하여 즉시 모니터링 루프 진입.
    return true; 
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reserveBtn = buttons.find(el => el.textContent && (el.textContent.includes('예매하기') || el.textContent.includes('예매 안내사항')));
      return reserveBtn && !reserveBtn.disabled && getComputedStyle(reserveBtn).display !== 'none';
    });
  }

  getBookingButtonSelector() {
    // Playwright의 텍스트 기반 선택자를 사용하여 동적으로 렌더링된 버튼 클릭
    return 'button:has-text("예매")';
  }
}
module.exports = { InterparkStrategy };
