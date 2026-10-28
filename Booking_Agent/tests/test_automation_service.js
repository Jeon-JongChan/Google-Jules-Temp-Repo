const { AutomationService } = require('../src/main/automation/AutomationService');
const { StrategyFactory } = require('../src/main/automation/StrategyFactory');

async function testAutomationServiceErrorPath() {
    let logs = [];
    const sendLog = (msg, type) => {
        logs.push({ msg, type });
    };

    // Test 1: Error during launch/start
    const service1 = new AutomationService(sendLog);
    service1.browserFacade.launch = async () => {
        throw new Error("Mock Launch Error");
    };

    await service1.start({ site: 'interpark', url: 'https://ticket.interpark.com/123' });

    const hasLaunchError = logs.some(log => log.msg.includes('시작 중 오류 발생: Mock Launch Error') && log.type === 'error');
    if (!hasLaunchError) {
        console.error("FAIL: Did not catch launch error", logs);
        process.exit(1);
    }

    // Test 2: Error during strategy execute
    logs = [];
    const service2 = new AutomationService(sendLog);
    service2.browserFacade.launch = async () => {
        return {}; // mock page
    };

    const originalGetStrategy = StrategyFactory.getStrategy;
    StrategyFactory.getStrategy = () => {
        return {
            execute: async () => {
                throw new Error("Mock Execute Error");
            },
            stop: async () => {}
        };
    };

    await service2.start({ site: 'interpark', url: 'https://ticket.interpark.com/123' });

    // execute() is not awaited in start(), it uses .then().catch()
    // We need to wait for the event loop to process the rejection
    await new Promise(resolve => setTimeout(resolve, 50));

    const hasExecuteErrorLog = logs.some(log => log.msg.includes('실행 중 에러: Mock Execute Error') && log.type === 'error');
    if (!hasExecuteErrorLog) {
        console.error("FAIL: Did not catch execute error", logs);
        process.exit(1);
    }

    // Verify stop was called. It should log something about stopping.
    const hasStopLog = logs.some(log => log.msg.includes('작업 중지 요청 처리 중...'));
    if (!hasStopLog) {
         console.error("FAIL: Did not call stop() on execute error", logs);
         process.exit(1);
    }

    StrategyFactory.getStrategy = originalGetStrategy;
    console.log(`Automation Service Error Path Test: passed.`);
}

testAutomationServiceErrorPath().then(() => {
    // success
}).catch(err => {
    console.error("Test failed with exception:", err);
    process.exit(1);
});
