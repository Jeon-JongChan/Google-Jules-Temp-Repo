const { TicketStrategy } = require('./TicketStrategy');

// [Clubbalcony] 자동화 로직 구현 보류 (보안/캡챠 등)
class ClubbalconyStrategy extends TicketStrategy {
  async execute() {
    this.sendLog('[Clubbalcony] 현재 이 사이트의 자동화 로직은 구현되어 있지 않습니다.', 'error');
    this.sendLog('보안 조치나 복잡한 흐름으로 인해 수동 예매를 권장합니다.', 'info');

    try {
      await this.page.goto(this.config.url);
      this.sendLog('해당 페이지로 이동했습니다. 직접 진행해주세요.', 'info');
    } catch(e) {
      this.sendLog('페이지 이동 실패.', 'error');
    }
  }
}

module.exports = { ClubbalconyStrategy };
