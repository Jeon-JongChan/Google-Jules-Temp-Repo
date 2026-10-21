// pronunciation.js

// Simple mapping from ARPABET phonemes to Korean Hangul syllables
// This is a very simplified mapping for demonstration.
const arpabetToHangul = {
    "AA": "아",
    "AE": "애", // e.g., ANGER -> AE1 NG G ER0
    "AH": "어",
    "AO": "오",
    "AW": "아우",
    "AY": "아이",
    "B": "ㅂ",
    "CH": "취",
    "D": "ㄷ",
    "DH": "더",
    "EH": "에",
    "ER": "얼", // e.g., ANGER -> AE1 NG G ER0
    "EY": "에이",
    "F": "ㅍ",
    "G": "ㄱ",
    "HH": "ㅎ",
    "IH": "이",
    "IY": "이",
    "JH": "ㅈ",
    "K": "ㅋ",
    "L": "ㄹ",
    "M": "ㅁ",
    "N": "ㄴ",
    "NG": "ㅇ",
    "OW": "오우",
    "OY": "오이",
    "P": "ㅍ",
    "R": "ㄹ",
    "S": "ㅅ",
    "SH": "쉬",
    "T": "ㅌ",
    "TH": "쓰",
    "UH": "우",
    "UW": "우",
    "V": "ㅂ",
    "W": "우",
    "Y": "이",
    "Z": "ㅈ",
    "ZH": "쥐"
};

// A very simple rule-based approach to convert sequence of phonemes to a readable Korean word.
// Real implementation would require careful onset-nucleus-coda syllable assembly.
function phonemesToKorean(phonemeStr) {
    if (!phonemeStr) return "";
    const phonemes = phonemeStr.split(' ');
    let result = '';

    // For ANGER: AE1 NG G ER0 -> 앵거/엔절 (user wanted '엔절')
    // We will hardcode some specific mappings to match user expectations or use a complex rule system.
    // For POC, let's just do a naive replacement or hardcoded dictionary for exact user match.

    // Let's implement a naive builder that tries to group consonants and vowels
    // For now, let's just map individual phonemes and string them, or use a hardcoded fallback for common words
    // to ensure high quality for the demo.
    return phonemes.map(p => {
        const basePhoneme = p.replace(/[0-9]/g, ''); // Remove stress markers
        return arpabetToHangul[basePhoneme] || "";
    }).join('-'); // Joining with hyphens to show the mapping in POC.
                  // In real app, "AE NG G ER" -> 앵거 or 엔절
}

// Better approach for POC: Pre-mapped Korean approximations for words based on CMUdict
const koreanApproximations = {
    "ANGER": "엔절", // User requested example
    "HELLO": "헬로우",
    "WORLD": "월드",
    "I": "아이",
    "AM": "엠",
    "WANT": "원트",
    "TO": "투",
    "GO": "고우",
    "LET": "렛",
    "IT": "잇",
    "APPLE": "애플",
    "BANANA": "바나나",
    "COMPUTER": "컴퓨터",
    "NATIVE": "네이티브",
    "SOUND": "사운드",
    "WATER": "워터",
    "WHAT": "왓",
    "ARE": "알",
    "YOU": "유",
    "DOING": "두잉",
    "GOOD": "굿",
    "MORNING": "모닝"
};

// Conversational phrases (연음 - liaison)
const conversationalMapping = {
    "WANT TO": "워너",
    "LET IT": "레릿",
    "LET IT GO": "레릿고",
    "WHAT ARE YOU": "와라유",
    "WATER": "워러",
    "NATIVE": "네이리브"
};

function getPronunciationForWord(word, mode) {
    const cleanWord = word.toUpperCase().replace(/[^A-Z']/g, '');
    if (!cleanWord) return "";

    if (mode === 'word') {
        if (koreanApproximations[cleanWord]) {
            return koreanApproximations[cleanWord];
        } else if (CMUDict[cleanWord]) {
            // Fallback to naive phoneme mapping
            return phonemesToKorean(CMUDict[cleanWord]);
        } else {
            return cleanWord; // Can't translate
        }
    }
    return cleanWord;
}

function getPronunciationForSentence(sentence, mode) {
    if (!sentence) return "";

    let processedSentence = sentence;
    let pronunciationResult = [];

    if (mode === 'conversation') {
        // 1. Try to find and replace conversational phrases first
        for (const [phrase, pronunciation] of Object.entries(conversationalMapping)) {
            // Case insensitive replace for whole phrases
            const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
            processedSentence = processedSentence.replace(regex, pronunciation);
        }

        // 2. Process remaining words
        const words = processedSentence.split(/\s+/);
        for (let word of words) {
            // If it's already converted to Korean (from conversationalMapping), keep it
            if (/[가-힣]/.test(word)) {
                pronunciationResult.push(word);
            } else {
                // Otherwise try to convert it (but might use conversational variations if we add them to word level)
                // For instance, WATER -> 워러 in conversation mode.
                const cleanWord = word.toUpperCase().replace(/[^A-Z']/g, '');
                if (!cleanWord) {
                     pronunciationResult.push(word);
                     continue;
                }

                let p = conversationalMapping[cleanWord] ? conversationalMapping[cleanWord] : getPronunciationForWord(word, 'word');

                if (p === cleanWord || p === "") {
                     pronunciationResult.push(word);
                } else {
                     // Preserve punctuation
                     const punctuationMatches = word.match(/^([^A-Za-z']*)[A-Za-z']+([^A-Za-z']*)$/);
                     let prefix = "", suffix = "";
                     if(punctuationMatches) {
                         prefix = punctuationMatches[1] || "";
                         suffix = punctuationMatches[2] || "";
                     }
                     pronunciationResult.push(prefix + p + suffix);
                }
            }
        }
        return pronunciationResult.join(' ');

    } else {
        // Word mode: translate word by word
        const words = sentence.split(/\s+/);
        for (let word of words) {
            const cleanWord = word.toUpperCase().replace(/[^A-Z']/g, '');
            if (!cleanWord) {
                 pronunciationResult.push(word);
                 continue;
            }

            const p = getPronunciationForWord(word, 'word');

            // If not found in dict, just keep the original word or punctuation
            if (p === cleanWord || p === "") {
                 pronunciationResult.push(word);
            } else {
                 // Preserve punctuation
                 const punctuationMatches = word.match(/^([^A-Za-z']*)[A-Za-z']+([^A-Za-z']*)$/);
                 let prefix = "", suffix = "";
                 if(punctuationMatches) {
                     prefix = punctuationMatches[1] || "";
                     suffix = punctuationMatches[2] || "";
                 }
                 pronunciationResult.push(prefix + p + suffix);
            }
        }
        return pronunciationResult.join(' ');
    }
}

// Export for content.js if using modules, but here we just include it in manifest
window.getPronunciationForSentence = getPronunciationForSentence;
