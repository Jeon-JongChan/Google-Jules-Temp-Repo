const { TicketStrategy } = require('./TicketStrategy');
const { SeatSelectionUtil } = require('./SeatSelectionUtil');

class InterparkStrategy extends TicketStrategy {
  async execute() {
    this.isMonitoring = true;
    this.sendLog('[인터파크 티켓] 예매 모니터링을 시작합니다.', 'info');

    try {
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });

      this.sendLog('페이지 로드 완료. 사용자 로그인 상태를 확인합니다...', 'system');

      // P1-2: 고정 15초 대기 제거 및 로그인 상태 폴링 대기
      // (인터파크 예시: 로그아웃 버튼이나 특정 로그인된 유저 영역 감지)
      let isLoggedIn = false;
      for (let i = 0; i < 30; i++) { // 최대 30초 대기
        if (!this.isMonitoring) return;

        // 주의: 실제 사이트 로그인 상태 확인용 선택자 (예시)
        isLoggedIn = await this.page.evaluate(() => {
            const logoutBtn = document.querySelector('a[href*="logout"], .btn_logout');
            const myPageBtn = document.querySelector('.btn_mypage');
            return !!(logoutBtn || myPageBtn); // 로그인 되어있으면 true
        });

        if (isLoggedIn) {
            this.sendLog('로그인 확인 완료! 예매 버튼 활성화를 감시합니다.', 'success');
            break;
        }
        if (i === 0) this.sendLog('로그인이 필요합니다. 직접 브라우저에서 로그인해주세요.', 'info');
        await this.delay(1000);
      }

      if (!isLoggedIn && this.isMonitoring) {
          this.sendLog('로그인 상태를 확인할 수 없으나(비회원 예매 허용 등), 모니터링을 강제 시작합니다.', 'info');
      }

      // P1-1: 모니터링 제한 및 백오프 설정
      let maxAttempts = 60; // 최대 시도 횟수
      let attempt = 0;
      let baseDelay = 3000;

      while (this.isMonitoring && attempt < maxAttempts) {
        attempt++;

        const isButtonActive = await this.page.evaluate(() => {
          const btn = document.querySelector('a.btn_reservation, .productWrapper .btn_reserve, a[data-check="true"]');
          return btn && getComputedStyle(btn).display !== 'none' && !btn.classList.contains('disabled');
        });

        if (isButtonActive) {
          this.sendLog('인터파크 예매 버튼 활성화 감지! 클릭 시도...', 'success');

          const popupPromise = this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null);
          await this.page.click('a.btn_reservation, .productWrapper .btn_reserve, a[data-check="true"]');

          this.sendLog('예매 팝업/새 탭 대기 중...', 'info');
          const popupPage = await popupPromise;
          let targetPage = popupPage || this.page;
          await targetPage.waitForLoadState('domcontentloaded');

          this.sendLog('달력/회차 선택 단계는 현재 수동 진행이 필요합니다. (결제창 진입 시 좌석 선택 자동화 실행)', 'info');
          await targetPage.waitForTimeout(3000);

          // P0-3: 반환값 체크하여 실패 시 중단
          const seatSuccess = await SeatSelectionUtil.selectSeatByPreference(targetPage, this.sendLog, this.config.seatPreference, 'interpark');

          if (seatSuccess) {
              this.sendLog('자동화 단계 완료. 사용자 결제를 대기합니다.', 'success');
          } else {
              this.sendLog('좌석 선택에 실패했거나 지원하지 않는 구조입니다. 직접 예매를 진행해 주세요.', 'error');
          }
          break; // 예매 루프 탈출
        }

        // P1-1: 점진적 대기 시간(Backoff) 및 Jitter 적용
        let currentDelay = baseDelay + (attempt * 100);
        const jitter = Math.floor(Math.random() * 500);
        await this.delay(currentDelay + jitter);

        this.sendLog(`모니터링 중... (시도: ${attempt}/${maxAttempts})`, 'system');
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }

      if (attempt >= maxAttempts) {
          this.sendLog('최대 모니터링 시도 횟수를 초과하여 작업을 종료합니다.', 'error');
      }

      if (this.isMonitoring) {
          this.sendLog('결제 또는 직접 진행을 대기 중입니다.', 'system');
      }
    } catch (error) {
      if(this.isMonitoring) this.sendLog(`인터파크 자동화 중 오류: ${error.message}`, 'error');
    }
  }
}
module.exports = { InterparkStrategy };
