# Booking Agent (티켓 예매 자동화 봇)

Booking Agent는 Playwright와 Electron을 기반으로 제작된 **반자동 웹 크롤러 및 결제 보조 데스크톱 애플리케이션**입니다. 비전공자도 손쉽게 사용할 수 있도록 직관적인 UI와 무설치(Portable) 빌드를 지원합니다.

## 기능 (Features)
- **다양한 예매 사이트 지원 구조**: 인터파크, 티켓링크, YES24, 멜론티켓 등 다양한 사이트를 위한 뼈대가 마련되어 있습니다.
- **자동 감지**: 입력된 URL을 기반으로 대상 예매 사이트를 자동으로 인식합니다.
- **반자동화 흐름**: 대상 사이트 접속 후 예매 버튼 활성화를 감시하고 클릭합니다. 봇 차단이나 결제 보안 이슈를 피하기 위해 결제는 화면 최상단 팝업을 통해 사용자가 직접 수행하도록 설계되었습니다(Semi-Automation).
- **디자인 패턴 적용**: Facade, Strategy, Factory 패턴을 적용하여 새로운 예매 사이트 추가 및 유지보수가 매우 용이합니다.

## 지원 예정 사이트
현재 인터파크(Interpark)를 포함하여 다음 사이트들에 대한 확장 구조(Strategy)가 준비되어 있습니다. 자동화가 복잡한 사이트는 `NotImplementedStrategy`를 통해 직접 예매를 유도합니다.
- 인터파크 티켓
- 티켓링크
- YES24 티켓
- 멜론티켓
- 예술의전당
- 세종문화회관
- 국립극장
- LG아트센터 서울
- 롯데콘서트홀
- 라이브네이션 코리아
- 클럽발코니
- 타임티켓

## 설치 및 실행 방법

### 개발 환경 설정
Node.js가 설치되어 있어야 합니다.
\`\`\`bash
# 레포지토리 클론 후 이동
cd Booking_Agent

# 의존성 설치
npm install

# 애플리케이션 실행
npm start 명령어 실행 (터미널)
\`\`\`

### 배포용 빌드 (Windows 무설치 버전)
일반 사용자를 위해 단일 실행 파일(`.exe`)로 패키징할 수 있습니다.
\`\`\`bash
npm run dist
\`\`\`
빌드가 완료되면 `dist/` 폴더 내에 `.exe` 파일이 생성됩니다.

## 아키텍처 및 디자인 패턴
이 프로젝트는 유지보수와 확장을 위해 다음과 같은 패턴을 사용합니다.
- **Facade 패턴 (`BrowserFacade`)**: Playwright의 복잡한 브라우저 생성, 탭 관리 로직을 캡슐화.
- **Strategy 패턴 (`TicketStrategy` 및 하위 클래스)**: 각 웹사이트별 크롤링/예매 로직을 분리하여 관리.
- **Factory 패턴 (`StrategyFactory`)**: URL이나 선택된 사이트 ID에 따라 런타임에 적절한 Strategy 객체를 생성하여 주입.

## 기술 스택
- **Frontend**: Vanilla HTML, CSS, JavaScript (No Bundler)
- **Backend (Desktop)**: Electron, Node.js
- **Automation**: Playwright

## 기여 방법 (Contributing)
새로운 예매 사이트를 추가하려면 다음 단계를 따르세요:
1. `src/main/automation/strategies/` 폴더에 `[SiteName]Strategy.js` 파일을 생성하고 `TicketStrategy`를 상속받습니다.
2. `execute()` 메서드를 오버라이드하여 해당 사이트의 DOM 구조에 맞는 자동화 로직을 작성합니다.
3. `src/main/automation/StrategyFactory.js`에 새 전략을 등록하고, 자동 감지 로직(`detectSiteFromUrl`)에 URL 패턴을 추가합니다.
