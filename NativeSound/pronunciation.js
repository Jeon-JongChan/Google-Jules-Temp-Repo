// pronunciation.js

// Simple mapping from ARPABET phonemes to Korean Hangul syllables
const arpabetToHangul = {
    "AA": "아", "AE": "애", "AH": "어", "AO": "오", "AW": "아우", "AY": "아이",
    "B": "ㅂ", "CH": "취", "D": "ㄷ", "DH": "더", "EH": "에", "ER": "얼",
    "EY": "에이", "F": "ㅍ", "G": "ㄱ", "HH": "ㅎ", "IH": "이", "IY": "이",
    "JH": "ㅈ", "K": "ㅋ", "L": "ㄹ", "M": "ㅁ", "N": "ㄴ", "NG": "ㅇ",
    "OW": "오우", "OY": "오이", "P": "ㅍ", "R": "ㄹ", "S": "ㅅ", "SH": "쉬",
    "T": "ㅌ", "TH": "쓰", "UH": "우", "UW": "우", "V": "ㅂ", "W": "우",
    "Y": "이", "Z": "ㅈ", "ZH": "쥐"
};

// Fallback logic for words not in the dictionary.
// Very basic romanization to Hangul fallback to ensure English text is always converted.
const alphabetToHangul = {
    'a': '아', 'b': '브', 'c': '크', 'd': '드', 'e': '에', 'f': '프', 'g': '그',
    'h': '흐', 'i': '이', 'j': '즈', 'k': '크', 'l': '르', 'm': '므', 'n': '느',
    'o': '오', 'p': '프', 'q': '큐', 'r': '르', 's': '스', 't': '트', 'u': '유',
    'v': '브', 'w': '더블유', 'x': '엑스', 'y': '와이', 'z': '즈'
};

function fallbackPronunciation(word) {
    let result = '';
    const lowerWord = word.toLowerCase();

    // Very simple heuristic: try to group consonants and vowels roughly
    for (let i = 0; i < lowerWord.length; i++) {
        const char = lowerWord[i];
        if (alphabetToHangul[char]) {
            result += alphabetToHangul[char];
        }
    }

    return result || word;
}

function phonemesToKorean(phonemeStr) {
    if (!phonemeStr) return "";
    const phonemes = phonemeStr.split(' ');

    return phonemes.map(p => {
        const basePhoneme = p.replace(/[0-9]/g, '');
        return arpabetToHangul[basePhoneme] || "";
    }).join('');
}

const koreanApproximations = {
    "ANGER": "엔절",
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
        } else if (typeof CMUDict !== 'undefined' && CMUDict[cleanWord]) {
            return phonemesToKorean(CMUDict[cleanWord]);
        } else {
            return fallbackPronunciation(cleanWord);
        }
    }
    return cleanWord;
}

function getPronunciationForSentence(sentence, mode) {
    if (!sentence) return "";

    let processedSentence = sentence;
    let pronunciationResult = [];

    if (mode === 'conversation') {
        for (const [phrase, pronunciation] of Object.entries(conversationalMapping)) {
            const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
            processedSentence = processedSentence.replace(regex, pronunciation);
        }

        const words = processedSentence.split(/\s+/);
        for (let word of words) {
            if (/[가-힣]/.test(word)) {
                pronunciationResult.push(word);
            } else {
                const cleanWord = word.toUpperCase().replace(/[^A-Z']/g, '');
                if (!cleanWord) {
                     pronunciationResult.push(word);
                     continue;
                }

                let p = conversationalMapping[cleanWord] ? conversationalMapping[cleanWord] : getPronunciationForWord(word, 'word');

                if (p === cleanWord || p === "") {
                     pronunciationResult.push(word);
                } else {
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
        const words = sentence.split(/\s+/);
        for (let word of words) {
            const cleanWord = word.toUpperCase().replace(/[^A-Z']/g, '');
            if (!cleanWord) {
                 pronunciationResult.push(word);
                 continue;
            }

            const p = getPronunciationForWord(word, 'word');

            if (p === cleanWord || p === "") {
                 pronunciationResult.push(word);
            } else {
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
