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
    if (result.source_lang) sourceLang = result.source_lang;
    if (result.target_lang) targetLang = result.target_lang;
    if (result.is_enabled !== undefined) isEnabled = result.is_enabled;
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

// Observer to watch for subtitle changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        // 자막과 관련된 변경인지 확인하기 위해 필터링 (성능 개선)
        const isCaptionRelated = (node) => {
            if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
            return node.classList && (node.classList.contains('ytp-caption-segment') || node.classList.contains('ytp-caption-window-container') || node.closest('.ytp-caption-window-container'));
        };

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
            // Check if mutation happened inside the caption container to improve performance
            let parent = mutation.target;
            if (parent && parent.nodeType === Node.ELEMENT_NODE) {
                if (!parent.classList.contains('ytp-caption-segment') && !parent.classList.contains('ytp-caption-window-container') && !parent.closest('.ytp-caption-window-container')) {
                    return; // 자막 컨테이너 외부의 변경은 무시
                }
            }

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

    // Non-speech subtitle check (e.g. [Music], ♪)
    if (originalText.includes('♪') || (originalText.startsWith('[') && originalText.endsWith(']'))) {
        return;
    }

    // Source language check
    if (sourceLang === 'en') {
        if (!/[a-zA-Z]/.test(originalText)) return;
    } else {
        if (!/[a-zA-Z]/.test(originalText)) return;
    }

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

const startObserver = () => {
    // 자막 컨테이너가 나타나기를 기다렸다가 감시 범위를 좁히는 로직이 바람직하지만,
    // 전체를 감시하더라도 자막 컨테이너 내의 변화가 아닐 경우 조기 반환하도록 성능 개선
    const targetNode = document.body;
    const config = { childList: true, subtree: true, characterData: true };

    // Performance improvement on observer callback: Early return if mutation is entirely outside caption container.
    // However, MutationObserver is already instantiated with a callback above.
    observer.observe(targetNode, config);
};

if (document.body) {
    startObserver();
} else {
    document.addEventListener('DOMContentLoaded', startObserver);
}
