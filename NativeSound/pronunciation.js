// pronunciation.js
// 영어 ARPABET → 한글은 g2pK(Apache-2.0)의 외래어 표기법을 옮긴 것이다.
// 음소를 자모 그대로 이어 붙이면 알파벳 이름처럼 들려서, 음절까지 같은 규칙으로 맞춘다.
// https://github.com/Kyubyong/g2pK/blob/master/g2pk/english.py

const SHORT_VOWELS = new Set(["AE", "AH", "AX", "EH", "IH", "IX", "UH"]);
const VOWEL_HEADS = "AEIOUY";
const CONSONANT_HEADS = "BCDFGHJKLMNPQRSTVWXZ";
const STOP_CLUSTER_HEADS = "$BCDFGHJKLMNPQRSTVWXZ";
const PTK_CODA_BLOCK_HEADS = "AEIOULRMN";
const L_CODA_HEADS = "$BCDFGHJKLPQRSTVWXZ";

const VOWEL_BASES = new Set(["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW", "AWER"]);

// 강세 숫자를 뺀 음소 이름. 탄설음 판단에는 원래 강세를 남긴다.
function basePhoneme(phoneme) {
    return phoneme.replace(/\d/g, "");
}

// 뒤 모음이 약하면 t/d를 탄설음으로 본다. 0이 약강세다.
function isUnstressedVowel(phoneme) {
    return /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)0$/.test(phoneme);
}

// CMU 표기를 외래어 표기 처리에 맞게 고친다. 파찰음과 어말 R을 묶고, 강세는 남긴다.
function adjustArpabet(arpabets) {
    let string = " " + arpabets.join(" ") + " $";
    string = string.replace(/ T S /g, " TS ");
    string = string.replace(/ D Z /g, " DZ ");
    string = string.replace(/ AW\d* ER\d* /g, " AWER ");
    string = string.replace(/ IH\d* R \$/g, " IH ER ");
    string = string.replace(/ EH\d* R \$/g, " EH ER ");
    string = string.replace(/ \$/g, "");
    return string.trim().split(/\s+/).filter(Boolean);
}

// 초성 자모. W/Y는 뒤 모음과 합치기 위해 글자로 남겨 둔다.
function toChoseong(arpabet) {
    const map = {
        "B": "\u1107", "CH": "\u110E", "D": "\u1103", "DH": "\u1103", "DZ": "\u110C",
        "F": "\u1111", "G": "\u1100", "HH": "\u1112", "JH": "\u110C", "K": "\u110F",
        "L": "\u1105", "M": "\u1106", "N": "\u1102", "NG": "\u110B", "P": "\u1111",
        "R": "\u1105", "S": "\u1109", "SH": "\u1109", "T": "\u1110", "TH": "\u1109",
        "TS": "\u110E", "V": "\u1107", "W": "W", "Y": "Y", "Z": "\u110C", "ZH": "\u110C"
    };
    return map[arpabet] || arpabet;
}

// 중성 자모. 이중모음은 자모 두 개로 두고 compose가 음절로 나눈다.
function toJungseong(arpabet) {
    const map = {
        "AA": "\u1161", "AE": "\u1162", "AH": "\u1165", "AO": "\u1169",
        "AW": "\u1161\u116E", "AWER": "\u1161\u116F", "AY": "\u1161\u1175",
        "EH": "\u1166", "ER": "\u1165", "EY": "\u1166\u1175", "IH": "\u1175",
        "IY": "\u1175", "OW": "\u1169", "OY": "\u1169\u1175", "UH": "\u116E", "UW": "\u116E"
    };
    return map[arpabet] || arpabet;
}

// 받침 자모. 무성 파열음의 받침은 외래어 표기대로 ㅅ/ㅂ/ㄱ이다.
function toJongseong(arpabet) {
    const map = {
        "B": "\u11B8", "CH": "\u11BE", "D": "\u11AE", "DH": "\u11AE", "F": "\u11C1",
        "G": "\u11A8", "HH": "\u11C2", "JH": "\u11BD", "K": "\u11A8", "L": "\u11AF",
        "M": "\u11B7", "N": "\u11AB", "NG": "\u11BC", "P": "\u11B8", "R": "\u11AF",
        "S": "\u11BA", "SH": "\u11BA", "T": "\u11BA", "TH": "\u11BA", "V": "\u11B8",
        "W": "\u11BC", "Y": "\u11BC", "Z": "\u11BD", "ZH": "\u11BD"
    };
    return map[arpabet] || arpabet;
}

// W/Y 활음을 겹모음으로 합친다. g2pK reconstruct 쌍과 같은 순서다.
function reconstructJamo(string) {
    const pairs = [
        ["\u1100\u1173W", "\u1100W"],
        ["\u1112\u1173W", "\u1112W"],
        ["\u110F\u1173W", "\u110FW"],
        ["\u1102Y\u1165", "\u1102\u1175\u110B\u1165"],
        ["\u1103Y\u1165", "\u1103\u1175\u110B\u1165"],
        ["\u1105Y\u1165", "\u1105\u1175\u110B\u1165"],
        ["Y\u1175", "\u1175"],
        ["Y\u1161", "\u1163"],
        ["Y\u1162", "\u1164"],
        ["Y\u1165", "\u1167"],
        ["Y\u1166", "\u1168"],
        ["Y\u1169", "\u116D"],
        ["Y\u116E", "\u1172"],
        ["W\u1161", "\u116A"],
        ["W\u1162", "\u116B"],
        ["W\u1165", "\u116F"],
        ["W\u1169", "\u116F"],
        ["W\u116E", "\u116E"],
        ["W\u1166", "\u1170"],
        ["W\u1175", "\u1171"],
        ["\u1173\u1175", "\u1174"],
        ["Y", "\u1175"],
        ["W", "\u116E"]
    ];
    for (const [from, to] of pairs) {
        string = string.split(from).join(to);
    }
    return string;
}

// 초성+중성(+종성) 자모를 한글 음절로 합친다. 남은 자모는 자막에 알파벳처럼 보이지 않게 버린다.
function composeJamo(letters) {
    const withOnset = letters.replace(/(^|[^\u1100-\u1112])([\u1161-\u1175])/g, "$1\u110B$2");
    let out = "";
    let i = 0;
    while (i < withOnset.length) {
        const c = withOnset.charCodeAt(i);
        const isCho = c >= 0x1100 && c <= 0x1112;
        if (isCho && i + 1 < withOnset.length) {
            const j = withOnset.charCodeAt(i + 1);
            if (j >= 0x1161 && j <= 0x1175) {
                let jong = 0;
                let step = 2;
                if (i + 2 < withOnset.length) {
                    const k = withOnset.charCodeAt(i + 2);
                    if (k >= 0x11A8 && k <= 0x11C2) {
                        jong = k - 0x11A8 + 1;
                        step = 3;
                    }
                }
                out += String.fromCharCode(0xAC00 + ((c - 0x1100) * 21 + (j - 0x1161)) * 28 + jong);
                i += step;
                continue;
            }
        }
        if (c >= 0x1100 && c <= 0x11FF) {
            i += 1;
            continue;
        }
        out += withOnset[i];
        i += 1;
    }
    return out;
}

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

// 철자 폴백용으로 초성·중성·종성 인덱스를 한 글자로 합친다.
function composeHangul(cho, jung, jong) {
    const choIdx = chosungMap[cho];
    const jungIdx = jungsungMap[jung];
    const jongIdx = jongsungMap[jong] || 0;

    if (choIdx !== undefined && jungIdx !== undefined) {
        return String.fromCharCode(0xAC00 + (choIdx * 21 + jungIdx) * 28 + jongIdx);
    }
    return '';
}

// 사전에 없는 단어만 철자로 음절을 근사한다.
function fallbackPronunciation(word) {
    let result = '';
    // shortcut: 사전에 없는 단어만 철자 근사. 신경망 g2p가 필요해지면 이 함수를 교체한다.
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

// ARPABET 문자열을 한글 음절로 만든다. 자모를 나열하지 않는다.
function phonemesToKorean(phonemeStr) {
    if (!phonemeStr) return "";
    const phonemes = adjustArpabet(phonemeStr.trim().split(/\s+/));
    let ret = "";

    for (let i = 0; i < phonemes.length; i++) {
        const p = phonemes[i];
        const pPrev = i > 0 ? phonemes[i - 1] : "^";
        const pNext = i < phonemes.length - 1 ? phonemes[i + 1] : "$";
        const pNext2 = i + 2 < phonemes.length ? phonemes[i + 2] : "$";
        const base = basePhoneme(p);
        const prevBase = basePhoneme(pPrev);
        const nextBase = pNext === "$" ? "$" : basePhoneme(pNext);
        const nextHead = nextBase[0];

        // CMU와 ipa-dict는 t/d로만 적는다. 북미 영어는 모음(또는 모음+r)과 약모음 사이에서 이 소리를 ㄹ로 흘린다.
        const beforeBase = i > 1 ? basePhoneme(phonemes[i - 2]) : "";
        const flap = (base === "T" || base === "D") && isUnstressedVowel(pNext) &&
            (VOWEL_BASES.has(prevBase) || (prevBase === "R" && VOWEL_BASES.has(beforeBase)));
        if (flap) {
            ret += "\u1105";
        } else if (base === "P" || base === "T" || base === "K") {
            const prevShort = prevBase.slice(0, 2);
            if (SHORT_VOWELS.has(prevShort) && pNext === "$") {
                ret += toJongseong(base);
            } else if (SHORT_VOWELS.has(prevShort) && !PTK_CODA_BLOCK_HEADS.includes(nextHead)) {
                ret += toJongseong(base);
            } else if (STOP_CLUSTER_HEADS.includes(nextHead)) {
                ret += toChoseong(base) + "\u1173";
            } else {
                ret += toChoseong(base);
            }
        } else if (base === "B" || base === "D" || base === "G") {
            ret += toChoseong(base);
            if (STOP_CLUSTER_HEADS.includes(nextHead)) ret += "\u1173";
        } else if (base === "S" || base === "Z" || base === "F" || base === "V" || base === "TH" || base === "DH" || base === "SH" || base === "ZH") {
            ret += toChoseong(base);
            if (base === "S" || base === "Z" || base === "F" || base === "V" || base === "TH" || base === "DH") {
                if (STOP_CLUSTER_HEADS.includes(nextHead)) ret += "\u1173";
            } else if (base === "SH") {
                if (nextHead === "$") ret += "\u1175";
                else if (CONSONANT_HEADS.includes(nextHead)) ret += "\u1172";
                else ret += "Y";
            } else if (base === "ZH") {
                if (STOP_CLUSTER_HEADS.includes(nextHead)) ret += "\u1175";
            }
        } else if (base === "TS" || base === "DZ" || base === "CH" || base === "JH") {
            ret += toChoseong(base);
            if (STOP_CLUSTER_HEADS.includes(nextHead)) {
                ret += (base === "TS" || base === "DZ") ? "\u1173" : "\u1175";
            }
        } else if (base === "M" || base === "N" || base === "NG") {
            if ((base === "M" || base === "N") && VOWEL_HEADS.includes(nextHead)) ret += toChoseong(base);
            else ret += toJongseong(base);
        } else if (base === "L") {
            if (pPrev === "^") ret += toChoseong(base);
            else if (L_CODA_HEADS.includes(nextHead)) ret += toJongseong(base);
            else if (prevBase === "M" || prevBase === "N") ret += toChoseong(base);
            else if (VOWEL_HEADS.includes(nextHead)) ret += "\u11AF\u1105";
            else if ((nextBase === "M" || nextBase === "N") && !VOWEL_HEADS.includes(basePhoneme(pNext2)[0])) ret += "\u11AF\u1173\u1105";
        } else if (base === "ER") {
            // 앞이 활음 W/Y여도 ㅇ을 끼우지 않는다. compose가 모음 앞 ㅇ을 붙이고, W+어는 '워'로 합쳐진다.
            ret += toJungseong(base);
            if (VOWEL_HEADS.includes(nextHead)) ret += "\u1105";
        } else if (base === "R") {
            if (VOWEL_HEADS.includes(nextHead)) ret += toChoseong(base);
        } else if ("AEIOU".includes(base[0])) {
            ret += toJungseong(base);
        } else {
            ret += toChoseong(base);
        }
    }

    return composeJamo(reconstructJamo(ret));
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

// 손으로 맞춘 발음이 있으면 그것을 쓴다.
class CuratedStrategy {
    // 큐레이션 표에 있는 단어만 발음을 돌려준다.
    execute(cleanWord) {
        if (koreanApproximations[cleanWord]) {
            return koreanApproximations[cleanWord];
        }
        return null;
    }
}

// CMU 음소를 한글 음절로 바꾼다.
class CmuDictStrategy {
    // 사전에 있으면 음소 변환 결과를 돌려준다.
    execute(cleanWord) {
        if (typeof CMUDict !== 'undefined' && CMUDict[cleanWord]) {
            return phonemesToKorean(CMUDict[cleanWord]);
        }
        return null;
    }
}

// 사전에 없는 단어는 철자 근사로 넘긴다.
class FallbackStrategy {
    // 항상 철자 폴백 발음을 돌려준다.
    execute(cleanWord) {
        return fallbackPronunciation(cleanWord);
    }
}

const pronunciationStrategies = [
    new CuratedStrategy(),
    new CmuDictStrategy(),
    new FallbackStrategy()
];

// 단어 하나의 발음을 고른다. 큐레이션, CMU, 철자 폴백 순이다.
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


// 문장을 단어로 나눠 발음을 붙인다. 대화 모드에서는 긴 구를 먼저 바꾼다.
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
                const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
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
