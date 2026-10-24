const { BrowserFacade } = require('./BrowserFacade');
const { StrategyFactory } = require('./StrategyFactory');

class AutomationService {
  constructor(sendLog) {
    this.sendLog = sendLog;
    this.browserFacade = new BrowserFacade(sendLog);
    this.currentStrategy = null;
    this.isStopping = false; // 중지 경합(Race condition) 방지용 플래그
  }

  setUserDataDir(dir) {
    this.browserFacade.setUserDataDir(dir);
  }

  async start(config) {
    if (this.isStopping) {
        this.sendLog('이전 작업이 아직 종료 중입니다. 잠시 후 다시 시도하세요.', 'error');
        return;
    }

    try {
      this.sendLog('자동화 준비 중...', 'system');

      let siteId = config.site;
      if (siteId === 'auto') {
        siteId = StrategyFactory.detectSiteFromUrl(config.url);
        this.sendLog(`자동 감지된 사이트: ${siteId}`, 'info');
      }

      const page = await this.browserFacade.launch();

      this.currentStrategy = StrategyFactory.getStrategy(siteId, page, this.sendLog, config);

      // 실행 흐름 (async/await로 제어)
      this.currentStrategy.execute()
        .then(async () => {
           if (!this.isStopping) {
              await this.browserFacade.bringToFront();
              this.sendLog('자동화 로직 완료 대기 상태.', 'success');
           }
        })
        .catch(err => {
           if (!this.isStopping) {
               this.sendLog(`실행 중 에러: ${err.message}`, 'error');
               this.stop();
           }
        });

    } catch (error) {
      this.sendLog(`시작 중 오류 발생: ${error.message}`, 'error');
    }
  }

  async stop() {
    if (this.isStopping) return; // 이미 중지 진행 중
    this.isStopping = true;
    this.sendLog('작업 중지 요청 처리 중...', 'system');

    // 1. 현재 진행 중인 전략 루프 및 대기 중단 (P2-3: 안전한 종료)
    if (this.currentStrategy) {
      await this.currentStrategy.stop();
      this.currentStrategy = null;
    }

    // 2. 브라우저 자원 완전 회수
    await this.browserFacade.close();

    this.isStopping = false;
    this.sendLog('작업 및 브라우저가 안전하게 종료되었습니다.', 'system');
  }
}

module.exports = { AutomationService };
