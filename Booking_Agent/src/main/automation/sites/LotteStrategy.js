const { TicketStrategy } = require('./TicketStrategy');

class LotteStrategy extends TicketStrategy {
  getSiteName() {
    return '롯데콘서트홀';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('#btnMemberLogout_v, #btnMemberLogout, .header .logout, a[href*="logout"]'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('button.btn_perfsale');
      return btn && !btn.disabled && !btn.classList.contains('disabled') && getComputedStyle(btn).display !== 'none';
    });
  }

  getBookingButtonSelector() {
    return 'button.btn_perfsale';
  }
}
module.exports = { LotteStrategy };
