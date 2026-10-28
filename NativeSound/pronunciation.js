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
// A more advanced heuristic to convert English letters to Hangul syllables.
const chosungMap = {
    'b': 7, 'c': 15, 'd': 3, 'f': 17, 'g': 0, 'h': 18, 'j': 12, 'k': 15,
    'l': 5, 'm': 6, 'n': 2, 'p': 17, 'q': 15, 'r': 5, 's': 9, 't': 16,
    'v': 7, 'w': 11, 'x': 9, 'y': 11, 'z': 12, '': 11
};

const jungsungMap = {
    'a': 0, 'e': 5, 'i': 20, 'o': 8, 'u': 13, 'y': 20
};

const jongsungMap = {
    '': 0, 'b': 17, 'c': 24, 'd': 7, 'f': 17, 'g': 1, 'k': 1, 'l': 8,
    'm': 16, 'n': 4, 'p': 17, 'r': 8, 's': 19, 't': 19, 'ng': 21
};

function composeHangul(cho, jung, jong) {
    const choIdx = chosungMap[cho];
    const jungIdx = jungsungMap[jung];
    const jongIdx = jongsungMap[jong] || 0;

    if (choIdx !== undefined && jungIdx !== undefined) {
        return String.fromCharCode(0xAC00 + (choIdx * 21 + jungIdx) * 28 + jongIdx);
    }
    return '';
}

function fallbackPronunciation(word) {
    let result = '';
    // [한계 명시]: 완벽한 음운 엔진은 불가능하며, 사전 확장이 주된 해결책입니다.
    // 여기서는 흔한 영어 패턴에 대한 매우 제한적인(bounded) 폴백 보정을 수행합니다.
    let lowerWord = word.toLowerCase();
    lowerWord = lowerWord.replace(/tion/g, 'shun')
                         .replace(/ght/g, 't')
                         .replace(/through/g, 'thru');

    // Very simplified regex for CVC (Consonant-Vowel-Consonant) pattern approximation
    const pattern = /([bcdfghjklmnpqrstvwxyz]*)([aeiouy]+)([bcdfghjklmnpqrstvwxyz]*(?![aeiouy]))?/g;

    let match;
    let lastIndex = 0;

    while ((match = pattern.exec(lowerWord)) !== null) {
        // If there's unhandled prefix, append as basic consonant sounds
        if (match.index > lastIndex) {
            const prefix = lowerWord.substring(lastIndex, match.index);
            for(let i=0; i<prefix.length; i++) {
                const c = prefix[i];
                if(chosungMap[c] !== undefined) {
                    result += String.fromCharCode(0xAC00 + (chosungMap[c] * 21 + 18) * 28 + 0); // with 'ㅡ'
                } else {
                    result += c;
                }
            }
        }

        let cho = match[1] ? match[1][0] : '';
        let jung = match[2] ? match[2][0] : '';
        let jong = match[3] ? match[3] : '';

        // Handling complex consonants simply by taking the first character or splitting
        if (match[1].length > 1) {
            for(let i=0; i<match[1].length - 1; i++) {
                 const c = match[1][i];
                 if(chosungMap[c] !== undefined) {
                      result += String.fromCharCode(0xAC00 + (chosungMap[c] * 21 + 18) * 28 + 0);
                 }
            }
            cho = match[1][match[1].length - 1];
        }

        // Only take the first consonant for jongsung for simplicity in this basic fallback
        let jongKey = '';
        let leftoverJong = '';
        if (jong.length > 0) {
            if (jong === 'ng') {
                jongKey = 'ng';
            } else {
                jongKey = jong[0];
                if (jong.length > 1) leftoverJong = jong.substring(1);
            }
        }

        if (jongKey !== '' && jongsungMap[jongKey] === undefined) {
            leftoverJong = jongKey + leftoverJong;
            jongKey = '';
        }

        const syllable = composeHangul(cho, jung, jongKey);
        if (syllable) {
            result += syllable;
        }

        if (leftoverJong.length > 0) {
             for(let i=0; i<leftoverJong.length; i++) {
                 const c = leftoverJong[i];
                 if(chosungMap[c] !== undefined) {
                      result += String.fromCharCode(0xAC00 + (chosungMap[c] * 21 + 18) * 28 + 0);
                 }
            }
        }

        lastIndex = pattern.lastIndex;
        // avoid infinite loop on zero-length matches (though our regex shouldn't)
        if (match.index === pattern.lastIndex) {
            pattern.lastIndex++;
        }
    }

    if (lastIndex < lowerWord.length) {
         const suffix = lowerWord.substring(lastIndex);
         for(let i=0; i<suffix.length; i++) {
                const c = suffix[i];
                if(chosungMap[c] !== undefined) {
                    result += String.fromCharCode(0xAC00 + (chosungMap[c] * 21 + 18) * 28 + 0); // with 'ㅡ'
                } else {
                    result += c;
                }
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
    "MORNING": "모닝",
    "THE": "더"
};

const conversationalMapping = {
    "WANT TO": "워너",
    "LET IT": "레릿",
    "LET IT GO": "레릿고",
    "WHAT ARE YOU": "와라유",
    "WATER": "워러",
    "NATIVE": "네이리브"
};

const contractionMapping = {
    "DON'T": "돈트",
    "IT'S": "잇츠",
    "CAN'T": "캔트",
    "WON'T": "원트",
    "I'M": "아임",
    "YOU'RE": "유얼",
    "THAT'S": "대츠"
};

let cachedSortedMappings = null;

// Strategy Pattern for Word Pronunciation
class CuratedStrategy {
    execute(cleanWord) {
        if (koreanApproximations[cleanWord]) {
            return koreanApproximations[cleanWord];
        }
        return null;
    }
}

class CmuDictStrategy {
    execute(cleanWord) {
        if (typeof CMUDict !== 'undefined' && CMUDict[cleanWord]) {
            return phonemesToKorean(CMUDict[cleanWord]);
        }
        return null;
    }
}

class FallbackStrategy {
    execute(cleanWord) {
        return fallbackPronunciation(cleanWord);
    }
}

const pronunciationStrategies = [
    new CuratedStrategy(),
    new CmuDictStrategy(),
    new FallbackStrategy()
];

function getPronunciationForWord(word, mode, targetLang = 'ko') {
    let cleanWord = word.toUpperCase().replace(/[^A-Z']/g, '');
    if (!cleanWord) return "";

    if (mode === 'word') {
        if (targetLang === 'ko') {
            if (contractionMapping[cleanWord]) {
                return contractionMapping[cleanWord];
            }
            cleanWord = cleanWord.replace(/'/g, ''); // Remove remaining apostrophes before matching

            for (const strategy of pronunciationStrategies) {
                const result = strategy.execute(cleanWord);
                if (result) return result;
            }
        } else {
             // For non-Korean languages, just return the uppercase clean word
             // as a simple fallback or placeholder until real multi-language dictionaries are added.
             return cleanWord;
        }
    }
    return cleanWord;
}


function getPronunciationForSentence(sentence, mode, targetLang = 'ko') {
    if (!sentence) return "";

    const trimmed = sentence.trim();
    // 비발화 자막 필터 (괄호 포함 추가)
    if (trimmed.includes('♪') || trimmed.includes('♫') ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('(') && trimmed.endsWith(')'))) {
        return trimmed;
    }

    let processedSentence = sentence;
    let pronunciationResult = [];

    if (mode === 'conversation') {
        if (targetLang === 'ko') {
            // 구문의 길이가 긴 것부터 치환하도록 정렬 (캐싱을 통한 성능 개선)
            if (!cachedSortedMappings) {
                cachedSortedMappings = Object.entries(conversationalMapping)
                    .sort((a, b) => b[0].length - a[0].length);
            }

            for (const [phrase, pronunciation] of cachedSortedMappings) {
                const regex = new RegExp(`\b${phrase}\b`, 'gi');
                processedSentence = processedSentence.replace(regex, pronunciation);
            }
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

                let p = (targetLang === 'ko' && conversationalMapping[cleanWord]) ? conversationalMapping[cleanWord] : getPronunciationForWord(word, 'word', targetLang);

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

            const p = getPronunciationForWord(word, 'word', targetLang);

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
