const { TicketStrategy } = require('./TicketStrategy');

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

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('a[onclick*="goTicket"]');
      return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    // ※ 주의: 상세 페이지의 예매 링크이나, 실제 결제는 인터파크/NOL 등 외부 예매처로 연결되는 경우가 많음.
    return 'a[onclick*="goTicket"]';
  }
}
module.exports = { SacStrategy };
