// ※ 미검증: Cloudflare 봇 차단 및 접속 무한 대기 문제(Timeout)로 인해 헤드리스/일반 브라우저 모두에서 DOM 확보 실패
const { TicketStrategy } = require('./TicketStrategy');
const { isBookingControlActive, bookingControlSelector } = require('./BookingButton');

class TicketlinkStrategy extends TicketStrategy {
  getSiteName() {
    return '티켓링크';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_area .logout, a[href*="logout"]'));
  }

  // 예매하기 문구 또는 기존 예매 버튼 클래스를 본다.
  async isButtonActive() {
    return isBookingControlActive(this.page, ['예매하기'], 'a.btn_reserve, button.reserveBtn, .btn_booking');
  }

  getBookingButtonSelector() {
    return bookingControlSelector(['예매하기'], 'a.btn_reserve, button.reserveBtn, .btn_booking');
  }
}
module.exports = { TicketlinkStrategy };
