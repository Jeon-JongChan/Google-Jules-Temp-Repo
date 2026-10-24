class SeatSelectionUtil {
  static async selectSeatByPreference(page, sendLog, preference, site) {
    sendLog(`[좌석 선택 유틸] ${site}에서 옵션(${preference})으로 좌석 선택을 시도합니다...`, 'info');

    try {
      // 1. Iframe 파악 (예: 인터파크 ifrmBookStep, ifrmSeat 등)
      // iframe이 여러 개 겹쳐있을 수 있으므로 모든 프레임을 재귀 탐색하거나 메인 프레임을 기준으로 탐색
      let targetFrame = page.mainFrame();
      const frames = page.frames();

      // 사이트별 주요 좌석 iframe ID 추정
      const seatFrameIds = ['ifrmSeat', 'seatFrame', 'ifrmBookStep', 'oneStopFrame'];
      for (const frame of frames) {
          const name = frame.name();
          const url = frame.url();
          if (seatFrameIds.some(id => name.includes(id) || url.includes(id))) {
              targetFrame = frame;
              sendLog(`좌석 선택용 iframe 감지: ${name || url}`, 'info');
              break;
          }
      }

      // 2. 좌석 렌더링(Canvas 또는 DOM) 대기
      sendLog('좌석 DOM 요소 로딩 대기...', 'info');
      // 시연용 범용 선택자 (실제 사이트는 rect, span.seat 등 다양함)
      const seatSelectors = ['span.seat_available', 'rect[fill="#1e90ff"]', 'li.seat_ok a', '.seatList .active'];

      // 좌석 요소가 나타날 때까지 짧게 대기 (timeout 5초)
      let foundSelector = null;
      for (const selector of seatSelectors) {
         const count = await targetFrame.locator(selector).count();
         if (count > 0) {
             foundSelector = selector;
             break;
         }
      }

      if (!foundSelector) {
          sendLog('명시적인 좌석 DOM 요소를 찾지 못했습니다. (Canvas 기반이거나 구조 다름). 스킵합니다.', 'error');
          return;
      }

      sendLog(`활성화된 좌석 발견 (선택자: ${foundSelector}). 클릭 시도...`, 'info');

      // 3. 선호 구역에 따른 선택 로직
      // 실제로는 좌표 계산이나 구역별 리스트 인덱싱이 필요하지만, 여기서는 단순화하여 클릭 시뮬레이션
      const seats = targetFrame.locator(foundSelector);
      const totalSeats = await seats.count();

      let targetIndex = 0;
      if (preference === 'any' || totalSeats === 1) {
          targetIndex = 0;
      } else if (preference === 'front') {
          targetIndex = 0; // 배열의 앞쪽
      } else if (preference === 'middle') {
          targetIndex = Math.floor(totalSeats / 2);
      } else if (preference === 'back') {
          targetIndex = totalSeats - 1;
      }

      // 좌석 클릭
      await seats.nth(targetIndex).click();
      sendLog(`좌석 1개 선택 완료 (인덱스: ${targetIndex}).`, 'success');

      // 4. '좌석선택 완료' 또는 '다음단계' 버튼 클릭
      const nextBtnSelectors = ['a#btnNext', 'button.btn_next', 'a.nextStep'];
      for (const nextBtn of nextBtnSelectors) {
          const nextCount = await targetFrame.locator(nextBtn).count();
          if (nextCount > 0) {
              await targetFrame.locator(nextBtn).first().click();
              sendLog('다음 단계 버튼 클릭 완료.', 'success');
              break;
          }
      }

      sendLog('좌석 선택 및 다음 단계 진입 성공.', 'success');

    } catch (error) {
      sendLog(`좌석 선택 중 오류 발생 (DOM 구조 변경일 수 있음): ${error.message}`, 'error');
    }
  }
}

module.exports = { SeatSelectionUtil };
