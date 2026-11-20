const { TicketStrategy } = require('./TicketStrategy');
const { isBookingControlActive, bookingControlSelector } = require('./BookingButton');

class LgartStrategy extends TicketStrategy {
  getSiteName() {
    return 'LG아트센터';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('a[href*="Logout"], .util_list .logout'));
  }

  // 공연 상세의 예매하기 버튼 또는 기존 판매 버튼을 본다.
  async isButtonActive() {
    return isBookingControlActive(this.page, ['예매하기'], 'button.btn_perfsale, button.btn-ticketing, a.btn-ticketing, .detail-btn-wrap .reserve');
  }

  getBookingButtonSelector() {
    return bookingControlSelector(['예매하기'], 'button.btn_perfsale, button.btn-ticketing, a.btn-ticketing, .detail-btn-wrap .reserve');
  }
}
module.exports = { LgartStrategy };
