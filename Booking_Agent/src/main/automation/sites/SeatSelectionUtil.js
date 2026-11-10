class SeatSelectionUtil {
  static async selectSeatByPreference(page, sendLog, preference, site) {
    sendLog(`[좌석 선택 유틸] ${site}에서 옵션(${preference})으로 좌석 선택을 시도합니다...`, 'info');

    try {
      let targetFrame = page.mainFrame();
      const frames = page.frames();

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

      sendLog('좌석 DOM 요소 로딩 대기...', 'info');
      const seatSelectors = ['span.seat_available', 'rect[fill="#1e90ff"]', 'li.seat_ok a', '.seatList .active'];

      let foundSelector = null;
      let seatLocators = null;
      for (const selector of seatSelectors) {
         try {
           // 요소가 1개 이상 나타날 때까지 대기
           // P2-3: 대기 중 취소 로직을 위해 Promise.race 적용
           let waitPromise = targetFrame.waitForSelector(selector, { state: 'attached', timeout: 5000 });
           if (page._abortController) {
               waitPromise = Promise.race([
                   waitPromise,
                   new Promise((_, reject) => {
                       page._abortController.signal.addEventListener('abort', () => reject(new Error('AbortError')), {once: true});
                   })
               ]);
           }
           await waitPromise;
           const count = await targetFrame.locator(selector).count();
           if (count > 0) {
               foundSelector = selector;
               seatLocators = targetFrame.locator(selector);
               break;
           }
         } catch (e) {
           // 해당 선택자가 없으면 계속 탐색
         }
      }

      if (!foundSelector) {
          sendLog('명시적인 좌석 DOM 요소를 찾지 못했습니다. (Canvas 기반이거나 이미 매진일 수 있음). 좌석 선택 단계를 건너뜁니다.', 'error');
          sendLog('이 사이트의 좌석 지도가 Canvas 등 DOM으로 접근할 수 없는 구조라면 수동으로 선택해 주세요.', 'system');
          return false; // P0-3: 명확히 false 반환
      }

      const totalSeats = await seatLocators.count();
      sendLog(`활성화된 좌석 ${totalSeats}개 발견 (선택자: ${foundSelector}). 위치 기반 정렬 시도...`, 'info');

      // P0-1: boundingBox()를 이용해 화면상 물리적 Y좌표로 정렬
      const seatData = [];
      for (let i = 0; i < totalSeats; i++) {
         const locator = seatLocators.nth(i);
         try {
            const box = await locator.boundingBox();
            if (box) {
               seatData.push({ index: i, locator: locator, y: box.y, x: box.x });
            }
         } catch(e) {
            // 보이지 않는 요소 무시
         }
      }

      if (seatData.length === 0) {
          sendLog('표시되는 좌석 요소의 좌표를 추출할 수 없습니다. 클릭 불가.', 'error');
          return false;
      }

      // 화면상 Y좌표(위->아래) 기준으로 정렬 (Y값이 작을수록 화면 위쪽 = 보통 앞쪽 좌석)
      seatData.sort((a, b) => a.y - b.y);

      let targetSeat = seatData[0]; // 기본은 가장 앞(위)

      if (preference === 'any' || seatData.length === 1) {
          targetSeat = seatData[0];
      } else if (preference === 'front') {
          targetSeat = seatData[0]; // 화면 위쪽
      } else if (preference === 'middle') {
          targetSeat = seatData[Math.floor(seatData.length / 2)]; // 화면 중간
      } else if (preference === 'back') {
          targetSeat = seatData[seatData.length - 1]; // 화면 아래쪽
      }

      await targetSeat.locator.click();
      sendLog(`좌석 선택 완료 (옵션: ${preference}, Y좌표: ${targetSeat.y}).`, 'success');

      const nextBtnSelectors = ['a#btnNext', 'button.btn_next', 'a.nextStep'];
      let clickedNext = false;
      for (const nextBtn of nextBtnSelectors) {
          const nextCount = await targetFrame.locator(nextBtn).count();
          if (nextCount > 0) {
              await targetFrame.locator(nextBtn).first().click();
              sendLog('다음 단계 버튼 클릭 완료.', 'success');
              clickedNext = true;
              break;
          }
      }

      if (!clickedNext) {
          sendLog('다음 단계 버튼을 찾지 못했습니다. 결제창 진입을 직접 진행해 주세요.', 'info');
      }

      return true; // 성공 시 true

    } catch (error) {
      sendLog(`좌석 선택 중 예상치 못한 오류 발생: ${error.message}`, 'error');
      return false;
    }
  }
}

module.exports = { SeatSelectionUtil };
