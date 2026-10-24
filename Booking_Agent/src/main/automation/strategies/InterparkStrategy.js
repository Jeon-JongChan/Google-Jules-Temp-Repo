const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class InterparkStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[인터파크 티켓] 예매 모니터링을 시작합니다.', 'info');

    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });

      this.sendLog('페이지 로드 완료. (로그인이 필요한 경우 지금 진행해주세요. 15초 대기)', 'system');
      await this.delay(15000); // 사용자 로그인 대기

      while (this.isMonitoring) {
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('a.btn_reservation, .productWrapper .btn_reserve, a[data-check="true"]');
          return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
        });

        if (isButtonActive) {
          this.sendLog('인터파크 예매 버튼 활성화 감지! 클릭 시도...', 'success');

          // 새 창(팝업)이 열리는 것을 감지하기 위해 Promise 설정
          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click('a.btn_reservation, .productWrapper .btn_reserve, a[data-check="true"]');

          this.sendLog('예매 팝업/새 탭 대기 중...', 'info');
          const popupPage = await popupPromise;

          let targetPage = popupPage || this.page;
          await targetPage.waitForLoadState('domcontentloaded');

          // 팝업 내부의 Iframe 구조 처리 (인터파크는 종종 iframe(id='ifrmBookStep')을 사용)
          this.sendLog('예매창 진입 완료. 날짜/회차 및 좌석 선택 로직 시도...', 'info');

          // 실제 구동시 복잡한 달력/회차 선택까지 자동화는 캡챠 등 막힘 방지 위해 스킵하거나,
          // 바로 좌석 선택 iframe 렌더링을 기다린다고 가정.
          await targetPage.waitForTimeout(3000); // 렌더링 대기

          await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, 'interpark');

          this.sendLog('자동화 단계 완료. 사용자 결제를 대기합니다.', 'success');
          break;
        }

        await this.delay(3000);
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }

      if (this.isMonitoring) {
          this.sendLog('결제가 완료될 때까지 대기합니다. (직접 결제 진행 요망)', 'system');
      }
    } catch (error) {
      if(this.isMonitoring) this.sendLog(`인터파크 자동화 중 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { InterparkStrategy };
