document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('input[name="pronunciation_mode"]');

    // Load saved settings
    chrome.storage.local.get(['pronunciation_mode'], (result) => {
        const mode = result.pronunciation_mode || 'word';
        document.querySelector(`input[value="${mode}"]`).checked = true;
    });

    // Save settings on change
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            chrome.storage.local.set({ pronunciation_mode: e.target.value });
        });
    });
});
