const fs = require('fs');
const vm = require('vm');

const context = vm.createContext({});
const cmuCode = fs.readFileSync(__dirname + '/cmu_dict.js', 'utf-8');
const code = fs.readFileSync(__dirname + '/pronunciation.js', 'utf-8');

vm.runInContext(cmuCode, context);
vm.runInContext(code, context);

let failed = 0;

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        console.log(`[PASS] ${testName}`);
    } else {
        console.error(`[FAIL] ${testName} - Expected: '${expected}', Actual: '${actual}'`);
        failed++;
    }
}

function evaluate(expr) {
    return vm.runInContext(expr, context);
}

// "HELLO" is in CMUDict as "HH AH0 L OW1". phonemesToKorean strips numbers -> HH AH L OW.
// arpabetToHangul maps: HH->ㅎ, AH->어, L->ㄹ, OW->오우 => "ㅎ어ㄹ오우".
assertEqual(evaluate("getPronunciationForWord('HELLO', 'word', 'ko')"), 'ㅎ어ㄹ오우', 'Word Mode - CMU Priority (HELLO)');

// "ANGER" is in CMUDict as "AE1 NG G ER0".
// arpabetToHangul maps: AE->애, NG->ㅇ, G->ㄱ, ER->얼 => "애ㅇㄱ얼".
assertEqual(evaluate("getPronunciationForWord('ANGER', 'word', 'ko')"), '애ㅇㄱ얼', 'Word Mode - CMU Priority (ANGER)');

// Test 3: Sentence Mode (Conversation - "LET IT GO" mapping bug fix)
// "LET IT GO" should be "레릿고"
assertEqual(evaluate("getPronunciationForSentence('LET IT GO', 'conversation', 'ko')"), '레릿고', 'Conversation Mode - Longest phrase replacement first ("LET IT GO")');

// Test 4: Sentence Mode (Conversation - "LET IT")
assertEqual(evaluate("getPronunciationForSentence('LET IT BE', 'conversation', 'ko')"), '레릿 베', 'Conversation Mode - Shorter phrase replacement ("LET IT")');

// Test 4-1: Sentence Mode (Conversation - Multi-phrase matching priority)
// "WHAT ARE YOU DOING" includes "WHAT ARE YOU" mapping and "DOING" mapped by word.
// Note: "DOING" is in CMUDict as "D UW1 IH0 NG", mapped to "ㄷ우이ㅇ" by phonemesToKorean.
assertEqual(evaluate("getPronunciationForSentence('WHAT ARE YOU DOING', 'conversation', 'ko')"), '와라유 ㄷ우이ㅇ', 'Conversation Mode - Multi-phrase matching ("WHAT ARE YOU")');

// Test 5: Non-Korean Target Language
assertEqual(evaluate("getPronunciationForWord('APPLE', 'word', 'ja')"), 'APPLE', 'Non-Korean Target Lang - Should fallback to uppercase word');
assertEqual(evaluate("getPronunciationForSentence('LET IT GO', 'conversation', 'es')"), 'LET IT GO', 'Non-Korean Target Lang Sentence - Should fallback to uppercase words');

// Test 6: Non-speech subtitle check (If we exported processCaptionNode or tested content.js)
// Since we are only testing pronunciation.js logic here:
// (Optional) Test if fallback Pronunciation works. "BE" isn't in dictionaries -> fallback.
assertEqual(evaluate("getPronunciationForWord('BE', 'word', 'ko')"), '베', 'Fallback - Should return fallback for unknown word (BE)');

// Test 7: composeHangul unit tests
assertEqual(evaluate("composeHangul('g', 'a', '')"), '가', 'composeHangul - Happy path 1 (cho + jung)');
assertEqual(evaluate("composeHangul('h', 'a', 'n')"), '한', 'composeHangul - Happy path 2 (cho + jung + jong)');
assertEqual(evaluate("composeHangul('g', 'a')"), '가', 'composeHangul - Edge case 1 (undefined jong defaults to 0)');
assertEqual(evaluate("composeHangul('', 'a', '')"), '아', 'composeHangul - Edge case 2 (empty cho)');
assertEqual(evaluate("composeHangul('1', 'a', '')"), '', 'composeHangul - Error condition 1 (invalid cho)');
assertEqual(evaluate("composeHangul('g', '1', '')"), '', 'composeHangul - Error condition 2 (invalid jung)');

if (failed > 0) {
    console.error(`\nTests failed: ${failed}`);
    process.exit(1);
} else {
    console.log(`\nAll tests passed!`);
}
