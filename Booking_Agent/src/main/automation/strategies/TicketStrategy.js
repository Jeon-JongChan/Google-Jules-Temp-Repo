class TicketStrategy {
  constructor(page, sendLog, config) {
    this.page = page;
    this.sendLog = sendLog;
    this.config = config;
    this.isMonitoring = false;
  }

  // 각 하위 클래스에서 오버라이드 해야 할 메서드
  async execute() {
    throw new Error('execute() must be implemented by subclass');
  }

  async stop() {
    this.isMonitoring = false;
    this.sendLog('모니터링이 중지되었습니다.', 'system');
  }

  // 서버 부하 방지를 위한 유틸리티 함수
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { TicketStrategy };
