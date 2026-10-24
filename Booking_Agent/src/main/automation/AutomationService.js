const { BrowserFacade } = require('./BrowserFacade');
const { StrategyFactory } = require('./StrategyFactory');

class AutomationService {
  constructor(sendLog) {
    this.sendLog = sendLog;
    this.browserFacade = new BrowserFacade(sendLog);
    this.currentStrategy = null;
  }

  async start(config) {
    try {
      this.sendLog('자동화 준비 중...', 'system');

      let siteId = config.site;
      if (siteId === 'auto') {
        siteId = StrategyFactory.detectSiteFromUrl(config.url);
        this.sendLog(`자동 감지된 사이트: ${siteId}`, 'info');
      }

      const page = await this.browserFacade.launch();

      this.currentStrategy = StrategyFactory.getStrategy(siteId, page, this.sendLog, config);

      // 실행 흐름: 자동화 로직 -> 창 최상단 이동 -> (전략 내) 대기 -> 브라우저 종료 및 완료 처리
      this.currentStrategy.execute()
        .then(async () => {
           // 전략 실행(예매창 도달 등)이 완료되면 창을 최상단으로 올림
           await this.browserFacade.bringToFront();
           this.sendLog('사용자 개입 대기 또는 자동화 로직 완료.', 'success');
           // 추가적으로 특정 URL 대기 로직이 전략 안에 구현되어 완료되면,
           // 여기서 브라우저를 닫을 수 있습니다.
           // await this.stop();
        })
        .catch(err => {
           this.sendLog(`실행 중 에러: ${err.message}`, 'error');
           this.stop();
        });

    } catch (error) {
      this.sendLog(`시작 중 오류 발생: ${error.message}`, 'error');
    }
  }

  async stop() {
    if (this.currentStrategy) {
      await this.currentStrategy.stop();
      this.currentStrategy = null;
    }
    await this.browserFacade.close();
    this.sendLog('작업이 중지되거나 완료되었습니다.', 'system');
  }
}

module.exports = { AutomationService };
