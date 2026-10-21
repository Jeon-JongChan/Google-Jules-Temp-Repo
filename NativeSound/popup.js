document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('input[name="pronunciation_mode"]');
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
    chrome.storage.local.get(['pronunciation_mode'], (result) => {
        const mode = result.pronunciation_mode || 'word';
        const targetRadio = document.querySelector(`input[value="${mode}"]`);
        if(targetRadio) {
             targetRadio.checked = true;
        }
        updateCards(mode);
    });

    // Save settings on change
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newMode = e.target.value;
            chrome.storage.local.set({ pronunciation_mode: newMode });
            updateCards(newMode);
        });
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
