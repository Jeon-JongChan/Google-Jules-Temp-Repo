// ※ 미검증: 봇 차단, 리액트 SPA 지연, 파라미터 제약 등으로 실제 페이지 기반 실측 불가. 추측성 코드가 포함되어 있습니다.
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
