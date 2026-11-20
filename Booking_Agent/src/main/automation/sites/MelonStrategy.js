// ※ 미검증: HTTP 423 Locked 상태 코드 응답으로 인해 실측 접근 불가
const { TicketStrategy } = require('./TicketStrategy');
const { isBookingControlActive, bookingControlSelector } = require('./BookingButton');

class MelonStrategy extends TicketStrategy {
  getSiteName() {
    return '멜론티켓';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_logout, a[href*="logout"]'));
  }

  // 예매하기 문구 또는 기존 예매 버튼 id를 본다.
  async isButtonActive() {
    return isBookingControlActive(this.page, ['예매하기'], 'button#ticketReservation_Btn, .btn_ticketing');
  }

  getBookingButtonSelector() {
    return bookingControlSelector(['예매하기'], 'button#ticketReservation_Btn, .btn_ticketing');
  }
}
module.exports = { MelonStrategy };
