// ※ 주석: 각 예매 사이트의 DOM 구조(로그인/예매 버튼/좌석)는 캡차, 보안 팝업, 잦은 리뉴얼 등으로 인해 완벽한 실측이 불가하여 추측성(휴리스틱) 선택자를 사용했습니다.
class TicketStrategy {
  constructor(page, sendLog, config) {
    this.page = page;
    this.sendLog = sendLog;
    this.config = config;
    this.isMonitoring = false;
    this.abortController = new AbortController();
    this.page._abortController = this.abortController;
  }

  // 각 하위 클래스에서 오버라이드 해야 할 메서드
  async execute() {
    throw new Error('execute() must be implemented by subclass');
  }

  async stop() {
    this.isMonitoring = false;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.sendLog('모니터링이 즉시 중지되었습니다.', 'system');
  }

  // 서버 부하 방지를 위한 유틸리티 함수
  async delay(ms) {
    return new Promise(resolve => {
      const timeoutId = setTimeout(resolve, ms);

      if (!this.abortController) {
        this.abortController = new AbortController();
      }

      this.abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        resolve();
      }, { once: true });
    });
  }
}

module.exports = { TicketStrategy };
