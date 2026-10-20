// content.js
let currentMode = 'word';

// Get initial setting
chrome.storage.local.get(['pronunciation_mode'], (result) => {
    if (result.pronunciation_mode) {
        currentMode = result.pronunciation_mode;
    }
});

// Listen for setting changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.pronunciation_mode) {
        currentMode = changes.pronunciation_mode.newValue;
        // Optionally trigger an immediate update here
    }
});

// Observer to watch for subtitle changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            const addedNodes = mutation.addedNodes;
            addedNodes.forEach((node) => {
                // Looking for the specific YouTube subtitle element
                if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('ytp-caption-segment')) {
                    processCaptionNode(node);
                } else if (node.nodeType === Node.ELEMENT_NODE && node.querySelector) {
                     // Sometimes the parent is added
                     const segments = node.querySelectorAll('.ytp-caption-segment');
                     segments.forEach(processCaptionNode);
                }
            });
        } else if (mutation.type === 'characterData') {
             // Handle text changes within existing caption segments. mutation.target is a TextNode.
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
        }
    });
});

function processCaptionNode(node) {
    // We need to handle updates to the same node since youtube captions update word-by-word sometimes.
    // Instead of using a simple attribute, we can compare original text content

    // Find the actual text content by removing the text of any existing pronunciation elements we added
    let cloneNode = node.cloneNode(true);
    let existingPronunciations = cloneNode.querySelectorAll('.native-sound-pronunciation');
    existingPronunciations.forEach(el => el.remove());

    const originalText = cloneNode.textContent.trim();
    if (!originalText) return;

    // Check if we already processed this exact text
    const processedTextAttr = node.getAttribute('data-native-sound-processed-text');
    if (processedTextAttr === originalText) {
        return;
    }

    // We have new text, update our marker
    node.setAttribute('data-native-sound-processed-text', originalText);

    // Remove old pronunciation element if it exists so we can re-render it
    const oldPronunciationNode = node.querySelector('.native-sound-pronunciation');
    if (oldPronunciationNode) {
        oldPronunciationNode.remove();
    }

    // We only want to process English text (simple heuristic)
    if (!/[a-zA-Z]/.test(originalText)) return;

    // In a real scenario, this would call our pronunciation logic
    // For now, we mock it.
    const pronunciationText = getPronunciationForSentence(originalText, currentMode);

    if (pronunciationText) {
        // Create the pronunciation element
        const pronunciationSpan = document.createElement('span');
        pronunciationSpan.className = 'native-sound-pronunciation';
        pronunciationSpan.textContent = pronunciationText;

        // Append it below the original text
        node.appendChild(pronunciationSpan);
    }
}

// Start observing the body, wait for the player to load
const startObserver = () => {
    const targetNode = document.body; // In youtube, captions are added dynamically to the DOM
    const config = { childList: true, subtree: true, characterData: true };
    observer.observe(targetNode, config);
    console.log("NativeSound: Observer started.");
};

// YouTube uses a single-page app architecture, so we need to be careful about navigation
if (document.body) {
    startObserver();
} else {
    document.addEventListener('DOMContentLoaded', startObserver);
}
