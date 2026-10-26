// content.js
let currentMode = 'word';
let sourceLang = 'auto';
let targetLang = 'ko';
let isEnabled = true;

// Get initial setting
chrome.storage.local.get(['pronunciation_mode', 'source_lang', 'target_lang', 'is_enabled'], (result) => {
    if (chrome.runtime.lastError) {
        return;
    }
    if (result.pronunciation_mode) currentMode = result.pronunciation_mode;

    // Validate targetLang (ko only for now, fallbacks to ko)
    if (result.target_lang && result.target_lang === 'ko') {
        targetLang = 'ko';
    } else {
        targetLang = 'ko';
    }

    // Validate sourceLang (auto or en)
    if (result.source_lang && (result.source_lang === 'en' || result.source_lang === 'auto')) {
        sourceLang = result.source_lang;
    } else {
        sourceLang = 'auto';
    }

    if (result.is_enabled !== undefined) isEnabled = result.is_enabled;

    // Start observer only after settings are loaded to avoid race conditions
    startBodyObserver();
});

// Listen for setting changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.pronunciation_mode) currentMode = changes.pronunciation_mode.newValue;
        if (changes.source_lang) sourceLang = changes.source_lang.newValue;
        if (changes.target_lang) targetLang = changes.target_lang.newValue;
        if (changes.is_enabled) {
            isEnabled = changes.is_enabled.newValue;
            // 토글이 변경되었을 때 기존 자막들 다시 처리 (켜면 나타나고, 끄면 사라지도록)
            const segments = document.querySelectorAll('.ytp-caption-segment');
            segments.forEach(processCaptionNode);
        }
    }
});

// Observer to watch for subtitle changes (only for the caption container)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
             let parent = mutation.target.parentElement;
             if (parent && parent.classList && parent.classList.contains('ytp-caption-segment')) {
                 processCaptionNode(parent);
             } else if (parent) {
                 let closest = parent.closest('.ytp-caption-segment');
                 if (closest) {
                     processCaptionNode(closest);
                 }
             }
        } else if (mutation.type === 'childList' && mutation.target.classList && mutation.target.classList.contains('ytp-caption-segment')) {
             processCaptionNode(mutation.target);
        } else if (mutation.type === 'childList') {
            const addedNodes = mutation.addedNodes;

            // 만약 추가된 노드가 모두 발음 표시용 span 이라면 무시 (이중 처리 방지)
            let onlyPronunciationNodes = true;
            if (addedNodes.length > 0) {
                for (let i = 0; i < addedNodes.length; i++) {
                    const node = addedNodes[i];
                    if (node.nodeType !== Node.ELEMENT_NODE || !node.classList || !node.classList.contains('native-sound-pronunciation')) {
                        onlyPronunciationNodes = false;
                        break;
                    }
                }
            } else {
                onlyPronunciationNodes = false;
            }

            if (onlyPronunciationNodes) return;

            addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('ytp-caption-segment')) {
                    processCaptionNode(node);
                } else if (node.nodeType === Node.ELEMENT_NODE && node.querySelector) {
                     const segments = node.querySelectorAll('.ytp-caption-segment');
                     segments.forEach(processCaptionNode);
                }
            });
        }
    });
});

function processCaptionNode(node) {
    let cloneNode = node.cloneNode(true);
    let existingPronunciations = cloneNode.querySelectorAll('.native-sound-pronunciation');
    existingPronunciations.forEach(el => el.remove());

    if (!isEnabled) {
        node.removeAttribute('data-native-sound-processed-text');
        // 실제 DOM 노드에서도 기존 발음 span들을 삭제해야 함
        let realExistingPronunciations = node.querySelectorAll('.native-sound-pronunciation');
        realExistingPronunciations.forEach(el => el.remove());
        return; // 꺼져있으면 기존 노드만 삭제하고 종료
    }

    const originalText = cloneNode.textContent.trim();
    if (!originalText) return;

    // 비발화 체크 로직은 pronunciation.js에서 일괄 처리하도록 이관하여
    // 이곳에서는 제거합니다. (단위 테스트를 쉽게 하기 위함)

    // Source language check
    if (!/[a-zA-Z]/.test(originalText)) return;

    const processedTextAttr = node.getAttribute('data-native-sound-processed-text');
    if (processedTextAttr === originalText) {
        return;
    }

    node.setAttribute('data-native-sound-processed-text', originalText);

    const oldPronunciationNode = node.querySelector('.native-sound-pronunciation');
    if (oldPronunciationNode) {
        oldPronunciationNode.remove();
    }

    const pronunciationText = getPronunciationForSentence(originalText, currentMode, targetLang);

    if (pronunciationText && pronunciationText !== originalText) {
        const pronunciationSpan = document.createElement('span');
        pronunciationSpan.className = 'native-sound-pronunciation';
        pronunciationSpan.textContent = pronunciationText;

        node.appendChild(pronunciationSpan);
    }
}

let checkInterval = null;

const startCaptionObserver = (container) => {
    const config = { childList: true, subtree: true, characterData: true };
    observer.observe(container, config);

    // 주기적으로 컨테이너가 DOM에 여전히 존재하는지 체크하여, 삭제되었으면 다시 찾도록 함.
    // document.body의 subtree 전체를 감시하는 containerRemovalObserver는 성능 저하를 유발하므로 setInterval 사용.
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
        if (!document.body.contains(container)) {
            observer.disconnect();
            clearInterval(checkInterval);
            startBodyObserver();
        }
    }, 2000);
};

const startBodyObserver = () => {
    // 1. 자막 컨테이너가 이미 있는지 확인
    let container = document.querySelector('.ytp-caption-window-container');
    if (container) {
        startCaptionObserver(container);
        return;
    }

    // 2. 없다면 MutationObserver 대신 setInterval로 가볍게 폴링하여 기다림. (body subtree 감시 지양)
    let attempts = 0;
    const maxAttempts = 30; // 30번 (약 15초) 시도
    // [한계 명시]: 15초 내에 컨테이너가 나타나지 않으면 어쩔 수 없이 document.body 전체를 subtree:true로 감시해야 하는
    // MutationObserver 성능 최적화의 기술적 한계가 존재합니다.

    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
        container = document.querySelector('.ytp-caption-window-container');
        if (container) {
            clearInterval(checkInterval);
            startCaptionObserver(container);
        } else {
            attempts++;
            if (attempts >= maxAttempts) {
                // 시간 초과 시 fallback: 불가피하게 body에 기존처럼 넓은 observer 부착
                clearInterval(checkInterval);
                observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            }
        }
    }, 500);
};
