const { TicketStrategy } = require('./TicketStrategy');

class InterparkStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('인터파크 예매 모니터링을 시작합니다.', 'info');

    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
      this.sendLog('페이지 로드 완료. 예매 버튼 활성화를 감시합니다.', 'info');

      // 예매 버튼이 활성화될 때까지 반복 (가상의 선택자 사용)
      while (this.isMonitoring) {
        // 인터파크 예매 버튼 활성화 여부 확인 (예시 CSS 선택자)
        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('a.btn_reservation'); // 실제 사이트 구조에 맞게 변경 필요
          return btn && !btn.classList.contains('disabled');
        });

        if (isButtonActive) {
          this.sendLog('예매 버튼 활성화 감지! 클릭 시도...', 'success');
          // 예매 팝업 또는 페이지 이동 처리
          await this.page.click('a.btn_reservation');

          // 좌석 선택 및 결제창으로 이동하는 기본 로직 구현 필요 (복잡도에 따라 사용자 개입 유도)
          this.sendLog('예매 팝업이 열렸습니다. 이후 과정은 반자동으로 진행됩니다.', 'success');
          break;
        }

        // 서버 무리 방지 (3초 대기)
        await this.delay(3000);
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }

      // 반복문이 종료된 후 결제 대기 (사용자 개입 대기)
      if (this.isMonitoring) {
          this.sendLog('결제가 완료될 때까지 대기합니다...', 'info');
          // 사용자가 결제를 완료하고 특정 URL로 리다이렉트 되거나 창을 닫을 때까지 대기
          // await this.page.waitForURL(/.*order_complete.*/, { timeout: 0 }); // 예시
      }

    } catch (error) {
      if(this.isMonitoring) this.sendLog(`인터파크 자동화 중 오류: ${error.message}`, 'error');
    }
  }
}

module.exports = { InterparkStrategy };
