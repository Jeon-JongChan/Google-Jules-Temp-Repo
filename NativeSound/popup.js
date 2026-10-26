document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('input[name="pronunciation_mode"]');
    const sourceLangSelect = document.getElementById('source_lang');
    const targetLangSelect = document.getElementById('target_lang');
    const isEnabledToggle = document.getElementById('is_enabled');

    const cards = {
        'word': document.getElementById('card-word'),
        'conversation': document.getElementById('card-conversation')
    };

    function updateCards(selectedMode) {
        Object.values(cards).forEach(card => card.classList.remove('selected'));
        if(cards[selectedMode]) {
             cards[selectedMode].classList.add('selected');
        }
    }

    // Load saved settings
    chrome.storage.local.get(['pronunciation_mode', 'source_lang', 'target_lang', 'is_enabled'], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Storage error:", chrome.runtime.lastError);
            return;
        }
        const mode = result.pronunciation_mode || 'word';
        const sourceLang = result.source_lang || 'auto';
        const targetLang = result.target_lang || 'ko';
        const isEnabled = result.is_enabled !== undefined ? result.is_enabled : true;

        const targetRadio = document.querySelector(`input[value="${mode}"]`);
        if(targetRadio) {
             targetRadio.checked = true;
        }
        updateCards(mode);

        if (sourceLangSelect) sourceLangSelect.value = sourceLang;
        if (targetLangSelect) targetLangSelect.value = targetLang;
        if (isEnabledToggle) isEnabledToggle.checked = isEnabled;
    });

    // Save settings on change
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newMode = e.target.value;
            chrome.storage.local.set({ pronunciation_mode: newMode }, () => {
                if (chrome.runtime.lastError) console.error("Storage error:", chrome.runtime.lastError);
            });
            updateCards(newMode);
        });
    });

    if (sourceLangSelect) {
        sourceLangSelect.addEventListener('change', (e) => {
            chrome.storage.local.set({ source_lang: e.target.value }, () => {
                if (chrome.runtime.lastError) console.error("Storage error:", chrome.runtime.lastError);
            });
        });
    }

    if (targetLangSelect) {
        targetLangSelect.addEventListener('change', (e) => {
            chrome.storage.local.set({ target_lang: e.target.value }, () => {
                if (chrome.runtime.lastError) console.error("Storage error:", chrome.runtime.lastError);
            });
        });
    }

    if (isEnabledToggle) {
        isEnabledToggle.addEventListener('change', (e) => {
            chrome.storage.local.set({ is_enabled: e.target.checked }, () => {
                if (chrome.runtime.lastError) console.error("Storage error:", chrome.runtime.lastError);
            });
        });
    }

    // Make entire card clickable
    Object.keys(cards).forEach(key => {
         if (cards[key]) {
             cards[key].addEventListener('click', (e) => {
                  if(e.target.tagName !== 'INPUT') {
                       const radio = cards[key].querySelector('input[type="radio"]');
                       if (radio) {
                           radio.checked = true;
                           radio.dispatchEvent(new Event('change'));
                       }
                  }
             });
         }
    });
});
