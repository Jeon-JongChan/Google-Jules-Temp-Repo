const assert = require('assert');
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


async function testAutomationServiceStop() {
    let failed = false;
    function assert(condition, message) {
        if (!condition) {
            console.error(`FAIL: ${message}`);
            failed = true;
        }
    }

    console.log('Running AutomationService.stop() tests...');

    // Mock sendLog
    let logs = [];
    const sendLog = (msg, type) => logs.push({ msg, type });

    // Test 1: Normal stop with currentStrategy
    let service1 = new AutomationService(sendLog);
    let browserClosed1 = false;
    service1.browserFacade = { close: async () => { browserClosed1 = true; } };

    let strategyStopped1 = false;
    service1.currentStrategy = {
        stop: async () => { strategyStopped1 = true; }
    };

    await service1.stop();

    assert(strategyStopped1, 'currentStrategy.stop() should be called');
    assert(service1.currentStrategy === null, 'currentStrategy should be nullified');
    assert(browserClosed1, 'browserFacade.close() should be called');
    assert(service1.isStopping === false, 'isStopping should be false at the end');

    // Test 2: Early return if isStopping is true
    let service2 = new AutomationService(sendLog);
    service2.isStopping = true;
    let browserClosed2 = false;
    service2.browserFacade = { close: async () => { browserClosed2 = true; } };

    await service2.stop();

    assert(!browserClosed2, 'browserFacade.close() should NOT be called if already stopping');

    // Test 3: Stop without currentStrategy
    let service3 = new AutomationService(sendLog);
    let browserClosed3 = false;
    service3.browserFacade = { close: async () => { browserClosed3 = true; } };

    await service3.stop();
    assert(browserClosed3, 'browserFacade.close() should be called even without currentStrategy');

    if (failed) {
        process.exit(1);
    } else {
        console.log('All AutomationService tests passed.');
    }
}


// Test 1: Rejection when isStopping is true
async function testIsStopping() {
    let logs = [];
    const mockSendLog = (msg, level) => logs.push({ msg, level });

    const service = new AutomationService(mockSendLog);
    service.isStopping = true;
    await service.start({ site: 'interpark' });

    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].msg, '이전 작업이 아직 종료 중입니다. 잠시 후 다시 시도하세요.');
    assert.strictEqual(logs[0].level, 'error');
    console.log("PASS: Start is rejected when stopping.");
}

// Test 2: Successful start flow with site='auto'
async function testSuccessfulStart() {
    let logs = [];
    const mockSendLog = (msg, level) => logs.push({ msg, level });

    const service = new AutomationService(mockSendLog);

    // Mock BrowserFacade
    let bringToFrontCalled = false;
    service.browserFacade.launch = async () => ({ mockPage: true });
    service.browserFacade.bringToFront = async () => { bringToFrontCalled = true; };

    // Mock StrategyFactory
    const originalDetectSite = StrategyFactory.detectSiteFromUrl;
    StrategyFactory.detectSiteFromUrl = () => 'mock-site';

    const originalGetStrategy = StrategyFactory.getStrategy;
    let executeCalled = false;
    StrategyFactory.getStrategy = (siteId, page, sendLog, config) => {
        assert.strictEqual(siteId, 'mock-site');
        assert.strictEqual(page.mockPage, true);
        return {
            execute: async () => { executeCalled = true; },
            stop: async () => {}
        };
    };

    await service.start({ site: 'auto', url: 'https://test.com' });

    // Wait for the .then block in start to resolve
    await new Promise(resolve => setTimeout(resolve, 10));

    assert.ok(logs.some(l => l.msg === '자동화 준비 중...' && l.level === 'system'));
    assert.ok(logs.some(l => l.msg === '자동 감지된 사이트: mock-site' && l.level === 'info'));
    assert.ok(logs.some(l => l.msg === '자동화 로직 완료 대기 상태.' && l.level === 'success'));
    assert.strictEqual(executeCalled, true);
    assert.strictEqual(bringToFrontCalled, true);

    // Restore mocks
    StrategyFactory.detectSiteFromUrl = originalDetectSite;
    StrategyFactory.getStrategy = originalGetStrategy;

    console.log("PASS: Successful start with 'auto' site.");
}

// Test 3: Error handling when strategy execution fails
async function testStrategyExecutionFailure() {
    let logs = [];
    const mockSendLog = (msg, level) => logs.push({ msg, level });

    const service = new AutomationService(mockSendLog);

    // Mock BrowserFacade
    let closeCalled = false;
    service.browserFacade.launch = async () => ({ mockPage: true });
    service.browserFacade.close = async () => { closeCalled = true; };

    // Mock StrategyFactory
    const originalGetStrategy = StrategyFactory.getStrategy;
    let stopCalled = false;
    StrategyFactory.getStrategy = (siteId, page, sendLog, config) => {
        return {
            execute: async () => { throw new Error('Strategy failed'); },
            stop: async () => { stopCalled = true; }
        };
    };

    await service.start({ site: 'interpark' });

    // Wait for the .catch block in start to resolve
    await new Promise(resolve => setTimeout(resolve, 10));

    assert.ok(logs.some(l => l.msg === '실행 중 에러: Strategy failed' && l.level === 'error'));
    assert.strictEqual(stopCalled, true);
    assert.strictEqual(closeCalled, true);

    // Restore mocks
    StrategyFactory.getStrategy = originalGetStrategy;

    console.log("PASS: Error handling when strategy execution fails.");
}

async function runTests() {
    console.log("Running AutomationService Tests...");
    try {
        await testIsStopping();
        await testSuccessfulStart();
        await testStrategyExecutionFailure();
        console.log(`AutomationService Test: 3/3 passed.`);
    } catch (e) {
        console.error(`AutomationService Test failed:`, e);
        process.exit(1);
    }
}


(async () => {
    try {
        await testAutomationServiceErrorPath();
        await testAutomationServiceStop();
        await runTests();
        console.log('Combined AutomationService Test: all suites passed.');
    } catch (err) {
        console.error('Combined AutomationService Test failed:', err);
        process.exit(1);
    }
})();
