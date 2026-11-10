// ※ 미검증: SPA 특성상 헤드리스에서 렌더링된 버튼 셀렉터의 클래스명(haha-*)이 유동적이거나 표준과 다를 수 있습니다.
const { TicketStrategy } = require('./TicketStrategy');

class LivenationStrategy extends TicketStrategy {
  getSiteName() {
    return '라이브네이션';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => {
      return !!document.querySelector('a.logout, .user-nav .sign-out');
    });
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('a, button'));
      const btn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('tickets'));
      return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'a[href*="tickets"]';
  }
}
module.exports = { LivenationStrategy };
