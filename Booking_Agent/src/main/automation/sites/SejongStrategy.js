const { TicketStrategy } = require('./TicketStrategy');

class SejongStrategy extends TicketStrategy {
  getSiteName() {
    return '세종문화회관';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => {
      const logoutElements = Array.from(document.querySelectorAll('.util_list .logout, a[href*="logout.do"], a[href*="logout"]'));
      return logoutElements.some(el => {
        // 요소가 화면에 보이는지 (표시 상태) 확인
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
      });
    });
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a.btn_after.ticketingBtn, a.btn_reserve, button.btn-reserve, .perform-btn-box .btn_red');
      return btn && !btn.classList.contains('disabled') && !btn.disabled;
    });
  }

  getBookingButtonSelector() {
    return 'a.btn_after.ticketingBtn, a.btn_reserve, button.btn-reserve, .perform-btn-box .btn_red';
  }
}
module.exports = { SejongStrategy };
