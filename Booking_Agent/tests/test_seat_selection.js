const { SeatSelectionUtil } = require('../src/main/automation/strategies/SeatSelectionUtil');

async function testSeatSorting() {
  console.log('Testing Seat Selection Sorting (Y-axis based)...');

  const logs = [];
  const sendLog = (msg, type) => logs.push(`[${type}] ${msg}`);

  let clickedIndex = -1;

  // Mock DOM Environment (역순 정렬된 돔 요소 제공)
  // 실제 Y좌표 (위치): A(맨 아래 300), B(중간 200), C(맨 위 100)
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

  // 1. front
  clickedIndex = -1;
  await SeatSelectionUtil.selectSeatByPreference(mockPage, sendLog, 'front', 'TestSite');
  if (clickedIndex === 2) {
      console.log('PASS: Front preference correctly clicked Seat C (Top Y-axis)');
  } else {
      console.error(`FAIL: Front clicked index ${clickedIndex}, expected 2`);
      allPassed = false;
  }

  // 2. middle (P3-1: middle 케이스 추가)
  clickedIndex = -1;
  await SeatSelectionUtil.selectSeatByPreference(mockPage, sendLog, 'middle', 'TestSite');
  // 3개일 경우 중간은 index 1 (Seat B, y: 200)이 되어야 함 (seatData.length = 3, Math.floor(3/2) = 1)
  // seatData는 y값 정렬 후 [C(100), B(200), A(300)]
  // 즉, 인덱스 1은 B(원래 배열의 index 1)
  if (clickedIndex === 1) {
      console.log('PASS: Middle preference correctly clicked Seat B (Middle Y-axis)');
  } else {
      console.error(`FAIL: Middle clicked index ${clickedIndex}, expected 1`);
      allPassed = false;
  }

  // 3. back
  clickedIndex = -1;
  await SeatSelectionUtil.selectSeatByPreference(mockPage, sendLog, 'back', 'TestSite');
  if (clickedIndex === 0) {
      console.log('PASS: Back preference correctly clicked Seat A (Bottom Y-axis)');
  } else {
      console.error(`FAIL: Back clicked index ${clickedIndex}, expected 0`);
      allPassed = false;
  }

  // 4. any (P3-1: any 케이스 추가)
  clickedIndex = -1;
  await SeatSelectionUtil.selectSeatByPreference(mockPage, sendLog, 'any', 'TestSite');
  // any는 첫 번째 요소를 기본 클릭하므로 front와 동일하게 C(index 2)가 되어야 함
  if (clickedIndex === 2) {
      console.log('PASS: Any preference correctly clicked Seat C (Top Y-axis)');
  } else {
      console.error(`FAIL: Any clicked index ${clickedIndex}, expected 2`);
      allPassed = false;
  }

  if (!allPassed) {
      process.exit(1);
  }
}

testSeatSorting();
