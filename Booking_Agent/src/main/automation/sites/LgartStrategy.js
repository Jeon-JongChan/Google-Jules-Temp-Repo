const { TicketStrategy } = require('./TicketStrategy');

class LgartStrategy extends TicketStrategy {
  getSiteName() {
    return 'LG아트센터';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('a[href*="Logout"], .util_list .logout'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('button.btn_perfsale, button.btn-ticketing, a.btn-ticketing, .detail-btn-wrap .reserve');
      return btn && !btn.disabled && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'button.btn_perfsale, button.btn-ticketing, a.btn-ticketing, .detail-btn-wrap .reserve';
  }
}
module.exports = { LgartStrategy };
