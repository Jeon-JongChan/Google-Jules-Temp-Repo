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

// CMU 음소를 음절로 합친다. 자모 나열(ㅌ에ㅅㅌ)이 아니라 실제 음가다.
assertEqual(evaluate("getPronunciationForWord('TEST', 'word', 'ko')"), '테스트', 'Word Mode - CMU syllable (TEST)');
assertEqual(evaluate("getPronunciationForWord('FILE', 'word', 'ko')"), '파일', 'Word Mode - CMU syllable (FILE)');
assertEqual(evaluate("getPronunciationForWord('KNOW', 'word', 'ko')"), '노', 'Word Mode - silent letter (KNOW)');
assertEqual(evaluate("getPronunciationForWord('WRITE', 'word', 'ko')"), '라이트', 'Word Mode - silent letter (WRITE)');
assertEqual(evaluate("getPronunciationForWord('WATER', 'word', 'ko')"), '워러', 'Word Mode - flap (WATER)');
assertEqual(evaluate("getPronunciationForWord('BETTER', 'word', 'ko')"), '베러', 'Word Mode - flap (BETTER)');
assertEqual(evaluate("getPronunciationForWord('CITY', 'word', 'ko')"), '시리', 'Word Mode - flap (CITY)');
assertEqual(evaluate("getPronunciationForWord('PARTY', 'word', 'ko')"), '파리', 'Word Mode - flap after R (PARTY)');
assertEqual(evaluate("getPronunciationForWord('FAMILY', 'word', 'ko')"), '팸리', 'Word Mode - reduced vowel (FAMILY)');
assertEqual(evaluate("getPronunciationForWord('EVERY', 'word', 'ko')"), '에브리', 'Word Mode - reduced er (EVERY)');
assertEqual(evaluate("getPronunciationForWord('PHONE', 'word', 'ko')"), '폰', 'Word Mode - PH digraph (PHONE)');
assertEqual(evaluate("getPronunciationForWord('PSYCHOLOGY', 'word', 'ko')"), '사이칼러지', 'Word Mode - silent P (PSYCHOLOGY)');
assertEqual(evaluate("getPronunciationForWord('WORLD', 'word', 'ko')"), '월드', 'Word Mode - glide syllable (WORLD)');
assertEqual(evaluate("getPronunciationForWord('QUEUE', 'word', 'ko')"), '큐', 'Word Mode - letter name vs word (QUEUE)');
assertEqual(evaluate("getPronunciationForSentence('old school', 'word', 'ko')"), '올드 스쿨', 'Sentence - old school');

// Test 3: Sentence Mode (Conversation - "LET IT GO" mapping bug fix)
// "LET IT GO" should be "레릿고"
assertEqual(evaluate("getPronunciationForSentence('LET IT GO', 'conversation', 'ko')"), '레릿고', 'Conversation Mode - Longest phrase replacement first ("LET IT GO")');

// Test 4: Sentence Mode (Conversation - "LET IT")
assertEqual(evaluate("getPronunciationForSentence('LET IT BE', 'conversation', 'ko')"), '레릿 비', 'Conversation Mode - Shorter phrase replacement ("LET IT")');

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

// BE는 /bi/라서 철자 '베'가 아니다. 사전에 없는 단어만 철자 폴백을 탄다.
assertEqual(evaluate("getPronunciationForWord('BE', 'word', 'ko')"), '비', 'CMU - BE is /bi/');
assertEqual(evaluate("getPronunciationForWord('QQQX', 'word', 'ko')"), evaluate("fallbackPronunciation('QQQX')"), 'Fallback - unknown word uses spelling fallback');
assertEqual(evaluate("getPronunciationForWord('QQQX', 'word', 'ko') === 'QQQX'"), false, 'Fallback - unknown word is not left as spelling');
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
