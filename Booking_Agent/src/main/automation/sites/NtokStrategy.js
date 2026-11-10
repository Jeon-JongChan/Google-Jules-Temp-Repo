const { TicketStrategy } = require('./TicketStrategy');

class NtokStrategy extends TicketStrategy {
  getSiteName() {
    return '국립극장';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_area a[href*="logout"], .logout-btn, a[href*="logout"]'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a.btn_dGrn.goPerf, a.btn_reservation, .ticket_btn_area .btn_red');
      return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'a.btn_dGrn.goPerf, a.btn_reservation, .ticket_btn_area .btn_red';
  }
}
module.exports = { NtokStrategy };
