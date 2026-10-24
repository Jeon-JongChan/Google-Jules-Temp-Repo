const { SeatSelectionUtil } = require('../src/main/automation/strategies/SeatSelectionUtil');

async function testSeatSorting() {
  console.log('Testing Seat Selection Sorting (Y-axis based)...');

  const logs = [];
  const sendLog = (msg, type) => logs.push(`[${type}] ${msg}`);

  let clickedIndex = -1;

  // Mock DOM Environment (역순 정렬된 돔 요소 제공)
  // DOM 순서로는 A가 0, B가 1, C가 2
  // 실제 Y좌표 (위치): A가 화면 맨 아래(300), B가 중간(200), C가 맨 위(100)
  const mockSeats = [
    { name: 'Seat A (Bottom)', y: 300, click: async () => { clickedIndex = 0; } },
    { name: 'Seat B (Middle)', y: 200, click: async () => { clickedIndex = 1; } },
    { name: 'Seat C (Top)', y: 100, click: async () => { clickedIndex = 2; } },
  ];

  const mockLocator = {
    count: async () => mockSeats.length,
    nth: (i) => ({
      boundingBox: async () => ({ x: 10, y: mockSeats[i].y, width: 10, height: 10 }),
      click: mockSeats[i].click
    }),
    first: () => ({ click: async () => {} })
  };

  const mockFrame = {
    name: () => 'ifrmSeat',
    url: () => 'http://test.com/seat',
    waitForSelector: async () => true,
    locator: (selector) => {
      // 좌석 선택자면 좌석 리턴, 넥스트 버튼이면 넥스트 리턴
      if (selector === 'a#btnNext' || selector === 'button.btn_next') {
         return { count: async () => 1, first: () => ({ click: async () => {} }) };
      }
      return mockLocator;
    }
  };

  const mockPage = {
    mainFrame: () => mockFrame,
    frames: () => [mockFrame]
  };

  let allPassed = true;

  // 1. 선호도: front (Y좌표가 가장 작은 C가 선택되어야 함. DOM인덱스 2)
  clickedIndex = -1;
  await SeatSelectionUtil.selectSeatByPreference(mockPage, sendLog, 'front', 'TestSite');
  if (clickedIndex === 2) {
      console.log('PASS: Front preference correctly clicked Seat C (Top Y-axis)');
  } else {
      console.error(`FAIL: Front clicked index ${clickedIndex}, expected 2`);
      allPassed = false;
  }

  // 2. 선호도: back (Y좌표가 가장 큰 A가 선택되어야 함. DOM인덱스 0)
  clickedIndex = -1;
  await SeatSelectionUtil.selectSeatByPreference(mockPage, sendLog, 'back', 'TestSite');
  if (clickedIndex === 0) {
      console.log('PASS: Back preference correctly clicked Seat A (Bottom Y-axis)');
  } else {
      console.error(`FAIL: Back clicked index ${clickedIndex}, expected 0`);
      allPassed = false;
  }

  if (!allPassed) {
      process.exit(1);
  }
}

testSeatSorting();
