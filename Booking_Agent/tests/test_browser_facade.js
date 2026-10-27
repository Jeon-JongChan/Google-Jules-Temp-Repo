const Module = require('module');
const originalRequire = Module.prototype.require;

let launchCalled = 0;
let mockPageError = null;

const mockPage = {
  on: (event, handler) => {
    if (event === 'pageerror' && mockPageError) {
      handler(new Error(mockPageError));
    }
  },
  isClosed: () => false,
  bringToFront: async () => {},
};

const mockContext = {
  pages: () => [mockPage],
  newPage: async () => mockPage,
  close: async () => {},
};

let launchShouldFail = false;

Module.prototype.require = function(request) {
  if (request === 'playwright') {
    return {
      chromium: {
        launchPersistentContext: async (dir, options) => {
          launchCalled++;
          if (launchShouldFail) {
            throw new Error('Mock Launch Error');
          }
          return mockContext;
        }
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

const { BrowserFacade } = require('../src/main/automation/BrowserFacade');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function runTests() {
  console.log('Testing BrowserFacade...');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`PASS: ${message}`);
    } else {
      console.error(`FAIL: ${message}`);
    }
  }

  // 1. Test fallback userDataDir
  let logs = [];
  let facade = new BrowserFacade((msg, type) => logs.push(`[${type}] ${msg}`));
  await facade.launch();
  assert(facade.userDataDir.includes('booking_agent_fallback_session'), 'Fallback userDataDir is set correctly');
  assert(launchCalled === 1, 'launchPersistentContext called');
  assert(facade.page === mockPage, 'page is set from mock');

  // 2. Test setUserDataDir
  facade = new BrowserFacade((msg, type) => logs.push(`[${type}] ${msg}`));
  const testDir = path.join(os.tmpdir(), 'test_booking_agent');
  facade.setUserDataDir(testDir);
  assert(fs.existsSync(facade.userDataDir), 'setUserDataDir creates directory');

  // 3. Test launch with pre-set userDataDir
  launchCalled = 0;
  await facade.launch();
  assert(launchCalled === 1, 'launchPersistentContext called with custom dir');
  assert(facade.userDataDir === path.join(testDir, 'playwright_session'), 'custom userDataDir is retained');

  // 4. Test launch error handling
  launchShouldFail = true;
  let errorCaught = false;
  try {
    await facade.launch();
  } catch (e) {
    errorCaught = true;
  }
  assert(errorCaught, 'Launch error is thrown and caught');
  assert(logs.some(l => l.includes('브라우저 시작 실패: Mock Launch Error')), 'Error logged on failure');

  console.log(`\nBrowserFacade Test: ${passed}/${total} passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
