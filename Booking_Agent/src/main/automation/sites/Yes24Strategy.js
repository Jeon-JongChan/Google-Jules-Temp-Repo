// ※ 미검증: STCLab SURFF 임시 접속 차단(봇 차단) 솔루션에 의해 접근이 막혀 정상적인 DOM 구조 획득 불가.
const { TicketStrategy } = require('./TicketStrategy');
const { isBookingControlActive, bookingControlSelector } = require('./BookingButton');

class Yes24Strategy extends TicketStrategy {
  getSiteName() {
    return 'YES24 티켓';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.logout, a[href*="Logout"]'));
  }

  // 예매하기 문구 또는 기존 예매 링크 클래스를 본다.
  async isButtonActive() {
    return isBookingControlActive(this.page, ['예매하기'], 'a.btn_booking, a.btn_reservation');
  }

  getBookingButtonSelector() {
    return bookingControlSelector(['예매하기'], 'a.btn_booking, a.btn_reservation');
  }
}
module.exports = { Yes24Strategy };
