const { StrategyFactory } = require('../src/main/automation/StrategyFactory');

function testUrlDetection() {
  const testCases = [
    { url: 'https://ticket.interpark.com/some/path', expected: 'interpark' },
    { url: 'https://evil.com/?x=interpark.com', expected: 'unknown' }, // 보안/오탐 검증
    { url: 'http://www.ticketlink.co.kr/product/1234', expected: 'ticketlink' },
    { url: 'https://ticket.yes24.com/Perf/50000', expected: 'yes24' },
    { url: 'https://timeticket.co.kr/index.php?number=123', expected: 'timeticket' },
    { url: 'invalid-url', expected: 'unknown' }, // 잘못된 URL 처리
  ];

  let passed = 0;
  testCases.forEach(tc => {
    const result = StrategyFactory.detectSiteFromUrl(tc.url);
    if (result === tc.expected) {
      passed++;
    } else {
      console.error(`FAIL: ${tc.url} -> Expected ${tc.expected}, got ${result}`);
    }
  });

  console.log(`URL Detection Test: ${passed}/${testCases.length} passed.`);
  if (passed !== testCases.length) {
      process.exit(1);
  }
}

testUrlDetection();
