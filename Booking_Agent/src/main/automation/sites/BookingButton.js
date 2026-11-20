// 공연 화면의 예매 버튼을 클래스 이름이 아니라 보이는 문구로 찾는다.

// 문구가 완전히 같고 화면에 보이는 버튼이나 링크가 있는지 본다.
async function isExactLabelVisible(page, labels) {
  return page.evaluate((labels) => {
    const nodes = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"]'));
    return nodes.some((el) => {
      const text = (el.innerText || el.value || '').replace(/\s+/g, ' ').trim();
      if (!labels.includes(text)) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
    });
  }, labels);
}

// 같은 문구만 집는 클릭 선택자를 만든다. 예매안내처럼 앞부분만 같은 메뉴는 제외한다.
function exactLabelSelector(labels) {
  return labels
    .map((label) => `a:text-is("${label}"), button:text-is("${label}")`)
    .join(', ');
}

// 문구가 같은 버튼이 있으면 그걸 쓰고, 없으면 기존 클래스 선택자를 본다.
async function isBookingControlActive(page, labels, classSelector) {
  if (await isExactLabelVisible(page, labels)) return true;
  if (!classSelector) return false;
  return page.evaluate((selector) => {
    const btn = document.querySelector(selector);
    if (!btn) return false;
    const style = window.getComputedStyle(btn);
    return style.display !== 'none' && style.visibility !== 'hidden' && !btn.disabled && !btn.classList.contains('disabled');
  }, classSelector);
}

// 클릭 선택자는 정확한 문구를 먼저 두고, 클래스 선택자를 뒤에 둔다.
function bookingControlSelector(labels, classSelector) {
  const byLabel = exactLabelSelector(labels);
  return classSelector ? `${byLabel}, ${classSelector}` : byLabel;
}

module.exports = { isExactLabelVisible, exactLabelSelector, isBookingControlActive, bookingControlSelector };
