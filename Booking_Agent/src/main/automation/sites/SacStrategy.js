const { TicketStrategy } = require('./TicketStrategy');
const { isBookingControlActive, bookingControlSelector } = require('./BookingButton');

class SacStrategy extends TicketStrategy {
  getSiteName() {
    return '예술의전당';
  }

  async checkLoginStatus() {
    // 실측 결과, 미로그인 상태일 때 a[href*="/site/main/membership/login"] 링크가 존재함.
    // 해당 링크가 존재하면 미로그인, 존재하지 않으면 로그인된 것으로 간주.
    return await this.page.evaluate(() => {
        const loginLink = document.querySelector('a[href*="/site/main/membership/login"]');
        return !loginLink;
    });
  }

  // 예매하기 문구 또는 goTicket 링크를 본다. 결제는 외부 예매처로 넘어가는 공연이 있다.
  async isButtonActive() {
    return isBookingControlActive(this.page, ['예매하기'], 'a[onclick*="goTicket"]');
  }

  getBookingButtonSelector() {
    return bookingControlSelector(['예매하기'], 'a[onclick*="goTicket"]');
  }
}
module.exports = { SacStrategy };
