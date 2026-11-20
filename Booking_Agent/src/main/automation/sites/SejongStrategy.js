const { TicketStrategy } = require('./TicketStrategy');

// 세종문화회관 공연 상세의 비회원 예매 링크를 찾는다.
class SejongStrategy extends TicketStrategy {
  // 로그에 찍을 사이트 이름.
  getSiteName() {
    return '세종문화회관';
  }

  // 화면에 보이는 로그아웃 링크가 있을 때만 로그인으로 본다.
  async checkLoginStatus() {
    return await this.page.evaluate(() => {
      const logoutElements = Array.from(document.querySelectorAll('.util_list .logout, a[href*="logout.do"], a[href*="logout"]'));
      return logoutElements.some(el => {
        // 요소가 화면에 보이는지 (표시 상태) 확인
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
      });
    });
  }

  // 공연 상세에 보이는 '비회원 예매' 링크가 예매 시작 버튼이다.
  async isButtonActive() {
    return await this.page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a.layerOpen'));
      const btn = links.find((el) => el.textContent && el.textContent.includes('비회원 예매'));
      if (!btn) return false;
      const style = window.getComputedStyle(btn);
      return style.display !== 'none' && style.visibility !== 'hidden' && btn.getClientRects().length > 0;
    });
  }

  // 클릭 대상은 레이어를 여는 비회원 예매 링크만 가리킨다.
  getBookingButtonSelector() {
    return 'a.layerOpen:has-text("비회원 예매")';
  }
}
module.exports = { SejongStrategy };
