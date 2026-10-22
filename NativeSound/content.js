// content.js
let currentMode = 'word';
let sourceLang = 'auto';
let targetLang = 'ko';

// Get initial setting
chrome.storage.local.get(['pronunciation_mode', 'source_lang', 'target_lang'], (result) => {
    if (result.pronunciation_mode) currentMode = result.pronunciation_mode;
    if (result.source_lang) sourceLang = result.source_lang;
    if (result.target_lang) targetLang = result.target_lang;
});

// Listen for setting changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.pronunciation_mode) currentMode = changes.pronunciation_mode.newValue;
        if (changes.source_lang) sourceLang = changes.source_lang.newValue;
        if (changes.target_lang) targetLang = changes.target_lang.newValue;
    }
});

// Observer to watch for subtitle changes
const observer = new MutationObserver((mutations) => {
    // Only process if target language is Korean (for now, as it's the only supported output)
    if (targetLang !== 'ko') return;

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

    const originalText = cloneNode.textContent.trim();
    if (!originalText) return;

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

    const pronunciationText = getPronunciationForSentence(originalText, currentMode);

    if (pronunciationText && pronunciationText !== originalText) {
        const pronunciationSpan = document.createElement('span');
        pronunciationSpan.className = 'native-sound-pronunciation';
        pronunciationSpan.textContent = pronunciationText;

        node.appendChild(pronunciationSpan);
    }
}

const startObserver = () => {
    const targetNode = document.body;
    const config = { childList: true, subtree: true, characterData: true };
    observer.observe(targetNode, config);
    console.log("NativeSound: Observer started.");
};

if (document.body) {
    startObserver();
} else {
    document.addEventListener('DOMContentLoaded', startObserver);
}
