const { TicketStrategy } = require('./TicketStrategy');
const { isBookingControlActive, bookingControlSelector } = require('./BookingButton');

class LotteStrategy extends TicketStrategy {
  getSiteName() {
    return '롯데콘서트홀';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('#btnMemberLogout_v, #btnMemberLogout, .header .logout, a[href*="logout"]'));
  }

  // 공연 상세의 예매하기 버튼 또는 판매 버튼을 본다.
  async isButtonActive() {
    return isBookingControlActive(this.page, ['예매하기'], 'button.btn_perfsale');
  }

  getBookingButtonSelector() {
    return bookingControlSelector(['예매하기'], 'button.btn_perfsale');
  }
}
module.exports = { LotteStrategy };
