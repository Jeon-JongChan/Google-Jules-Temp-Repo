// ※ 미검증: HTTP 423 Locked 상태 코드 응답으로 인해 실측 접근 불가
const { TicketStrategy } = require('./TicketStrategy');

class MelonStrategy extends TicketStrategy {
  getSiteName() {
    return '멜론티켓';
  }

  async checkLoginStatus() {
    return await this.page.evaluate(() => !!document.querySelector('.util_logout, a[href*="logout"]'));
  }

  async isButtonActive() {
    return await this.page.evaluate(() => {
      const btn = document.querySelector('button#ticketReservation_Btn, .btn_ticketing');
      return btn && !btn.disabled && !btn.classList.contains('disabled');
    });
  }

  getBookingButtonSelector() {
    return 'button#ticketReservation_Btn, .btn_ticketing';
  }
}
module.exports = { MelonStrategy };
