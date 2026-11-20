// ※ 미검증: Cloudflare 403 봇 차단 및 "Just a moment..." 챌린지로 인해 실측 불가.
// Patchright(CDP 누수 방지), Camoufox(브라우저 지문 위조) 등 우회 시도했으나 모두 실패함.
// IP 평판 문제로 추정되며 일반 가정용 네트워크에서의 확인이 필요함.
const { TicketStrategy } = require('./TicketStrategy');
const { isBookingControlActive, bookingControlSelector } = require('./BookingButton');

class TimeticketStrategy extends TicketStrategy {
  getSiteName() {
    return '타임티켓';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.header_logout, a[href*="logout"]'));
  }

  // 구매하기 또는 예매하기 문구, 없으면 기존 구매 버튼을 본다.
  async isButtonActive() {
    return isBookingControlActive(this.page, ['구매하기', '예매하기'], 'button.btn_buy, a.btn_reserve, .product_info .buy_btn');
  }

  getBookingButtonSelector() {
    return bookingControlSelector(['구매하기', '예매하기'], 'button.btn_buy, a.btn_reserve, .product_info .buy_btn');
  }
}
module.exports = { TimeticketStrategy };
