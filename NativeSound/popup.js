document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('input[name="pronunciation_mode"]');
    const sourceLangSelect = document.getElementById('source_lang');
    const targetLangSelect = document.getElementById('target_lang');

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
    chrome.storage.local.get(['pronunciation_mode', 'source_lang', 'target_lang'], (result) => {
        const mode = result.pronunciation_mode || 'word';
        const sourceLang = result.source_lang || 'auto';
        const targetLang = result.target_lang || 'ko';

        const targetRadio = document.querySelector(`input[value="${mode}"]`);
        if(targetRadio) {
             targetRadio.checked = true;
        }
        updateCards(mode);

        sourceLangSelect.value = sourceLang;
        targetLangSelect.value = targetLang;
    });

    // Save settings on change
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newMode = e.target.value;
            chrome.storage.local.set({ pronunciation_mode: newMode });
            updateCards(newMode);
        });
    });

    sourceLangSelect.addEventListener('change', (e) => {
        chrome.storage.local.set({ source_lang: e.target.value });
    });

    targetLangSelect.addEventListener('change', (e) => {
        chrome.storage.local.set({ target_lang: e.target.value });
    });

    // Make entire card clickable
    Object.keys(cards).forEach(key => {
         cards[key].addEventListener('click', (e) => {
              if(e.target.tagName !== 'INPUT') {
                   const radio = cards[key].querySelector('input[type="radio"]');
                   radio.checked = true;
                   radio.dispatchEvent(new Event('change'));
              }
         });
    });
});
