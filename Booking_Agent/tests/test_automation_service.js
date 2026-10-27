const { AutomationService } = require('../src/main/automation/AutomationService');

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

testAutomationServiceStop();
