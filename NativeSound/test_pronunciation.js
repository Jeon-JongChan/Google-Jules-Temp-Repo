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

// 2차 개선사항 반영 (Curated가 CMU보다 우선순위가 높음)
// HELLO와 ANGER는 koreanApproximations에 존재하므로 curated 발음이 나와야 함
assertEqual(evaluate("getPronunciationForWord('HELLO', 'word', 'ko')"), '헬로우', 'Word Mode - Curated Priority (HELLO)');
assertEqual(evaluate("getPronunciationForWord('ANGER', 'word', 'ko')"), '엔절', 'Word Mode - Curated Priority (ANGER)');
assertEqual(evaluate("getPronunciationForWord('THE', 'word', 'ko')"), '더', 'Word Mode - Curated Priority (THE)');

// Test 2-1: CMU Dictionary Expansion Check
// "TEST" is added to CMUDict but not in Curated, should map to 'T EH1 S T' -> ㅌ에ㅅㅌ
assertEqual(evaluate("getPronunciationForWord('TEST', 'word', 'ko')"), 'ㅌ에ㅅㅌ', 'Word Mode - CMU Fallback (TEST)');

// Test 3: Sentence Mode (Conversation - "LET IT GO" mapping bug fix)
// "LET IT GO" should be "레릿고"
assertEqual(evaluate("getPronunciationForSentence('LET IT GO', 'conversation', 'ko')"), '레릿고', 'Conversation Mode - Longest phrase replacement first ("LET IT GO")');

// Test 4: Sentence Mode (Conversation - "LET IT")
assertEqual(evaluate("getPronunciationForSentence('LET IT BE', 'conversation', 'ko')"), '레릿 베', 'Conversation Mode - Shorter phrase replacement ("LET IT")');

// Test 4-1: Sentence Mode (Conversation - Multi-phrase matching priority)
// "WHAT ARE YOU DOING" includes "WHAT ARE YOU" mapping and "DOING" mapped by word.
// Note: "DOING" is in koreanApproximations, so it is "두잉"
assertEqual(evaluate("getPronunciationForSentence('WHAT ARE YOU DOING', 'conversation', 'ko')"), '와라유 두잉', 'Conversation Mode - Multi-phrase matching ("WHAT ARE YOU")');

// Test 5: Non-Korean Target Language
assertEqual(evaluate("getPronunciationForWord('APPLE', 'word', 'ja')"), 'APPLE', 'Non-Korean Target Lang - Should fallback to uppercase word');
assertEqual(evaluate("getPronunciationForSentence('LET IT GO', 'conversation', 'es')"), 'LET IT GO', 'Non-Korean Target Lang Sentence - Should fallback to uppercase words');

// Test 6: Non-speech subtitle check
// Now it's inside getPronunciationForSentence
assertEqual(evaluate("getPronunciationForSentence('[Music]', 'conversation', 'ko')"), '[Music]', 'Non-speech filter - Square brackets [Music]');
assertEqual(evaluate("getPronunciationForSentence('(laughing)', 'conversation', 'ko')"), '(laughing)', 'Non-speech filter - Parentheses (laughing)');

// Test 7: Contraction check
assertEqual(evaluate("getPronunciationForWord(\"DON'T\", 'word', 'ko')"), '돈트', 'Contraction check - DONT');
assertEqual(evaluate("getPronunciationForWord(\"CAN'T\", 'word', 'ko')"), '캔트', 'Contraction check - CANT');

// Test 8: Fallback check
assertEqual(evaluate("getPronunciationForWord('BE', 'word', 'ko')"), '베', 'Fallback - Should return fallback for unknown word (BE)');
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
