const { TicketStrategy } = require('./TicketStrategy');
const { isBookingControlActive, bookingControlSelector } = require('./BookingButton');

class NtokStrategy extends TicketStrategy {
  getSiteName() {
    return '국립극장';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_area a[href*="logout"], .logout-btn, a[href*="logout"]'));
  }

  // 공연 상세에 있던 빠른예매, 또는 예매하기 버튼을 본다.
  async isButtonActive() {
    return isBookingControlActive(this.page, ['빠른예매', '예매하기'], 'a.btn_dGrn.goPerf, a.btn_reservation, .ticket_btn_area .btn_red');
  }

  getBookingButtonSelector() {
    return bookingControlSelector(['빠른예매', '예매하기'], 'a.btn_dGrn.goPerf, a.btn_reservation, .ticket_btn_area .btn_red');
  }
}
module.exports = { NtokStrategy };
