const assert = require('assert');
const { AutomationService } = require('../src/main/automation/AutomationService');
const { StrategyFactory } = require('../src/main/automation/StrategyFactory');

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

runTests();
