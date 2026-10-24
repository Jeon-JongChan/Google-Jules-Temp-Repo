# Lightweight Code Graph MCP for VS Code
경량 코드 그래프 MCP VS Code 확장 프로그램

<div align="center">
  <p>
    A lightweight, local-first Model Context Protocol (MCP) server for VS Code that enables AI agents to seamlessly navigate and understand your codebase's structure.<br/>
    AI 에이전트가 코드베이스 구조를 매끄럽게 탐색하고 이해할 수 있도록 지원하는 VS Code용 경량, 로컬 우선 Model Context Protocol(MCP) 서버입니다.
  </p>
</div>

## 🌟 Features / 주요 기능

- **AST-based Parsing**: Extracts classes, functions, methods, imports, and calls using Tree-sitter.
- **AST 기반 파싱**: Tree-sitter를 사용하여 클래스, 함수, 메서드, 임포트 및 호출 관계를 추출합니다.

- **Language Support**: JavaScript, TypeScript, Python.
- **언어 지원**: JavaScript, TypeScript, Python을 지원합니다.

- **Incremental Indexing**: Uses low-memory caching and updates only modified files.
- **증분 인덱싱**: 저메모리 캐싱을 사용하며 변경된 파일만 업데이트합니다.

- **MCP Tool Integration**: Provides tools like `search_symbols`, `get_dependencies`, and `get_callers` to your local LLM context.
- **MCP 도구 통합**: 로컬 LLM 컨텍스트에 `search_symbols`, `get_dependencies`, `get_callers`와 같은 도구를 제공합니다.

- **Offline & Private**: Fully local operation without external servers or cloud dependencies.
- **오프라인 및 프라이버시 보호**: 외부 서버나 클라우드 의존성 없이 100% 로컬 환경에서 작동합니다.


## 🚀 Getting Started / 시작하기

### Prerequisites / 사전 요구사항

You will need [Node.js](https://nodejs.org/) (v18 or higher) and [npm](https://npmjs.com/) installed on your machine.
본인의 컴퓨터에 [Node.js](https://nodejs.org/) (v18 이상) 및 [npm](https://npmjs.com/)이 설치되어 있어야 합니다.


### Build Instructions / 빌드 방법

1. Clone the repository and navigate to the extension directory:
   저장소를 클론하고 확장 프로그램 디렉터리로 이동합니다:
   ```bash
   git clone <repository_url>
   cd lightweight-graph-mcp
   ```

2. Install dependencies:
   의존성 패키지를 설치합니다:
   ```bash
   npm install
   ```

3. Bundle the extension and MCP server with esbuild (this produces a self-contained `dist/` with no runtime `node_modules`):
   esbuild로 확장 프로그램과 MCP 서버를 번들링합니다 (런타임 `node_modules`가 필요 없는 자체 완결형 `dist/`가 생성됩니다):
   ```bash
   npm run bundle
   ```

4. Run tests to ensure everything is working correctly:
   모든 기능이 정상적으로 작동하는지 확인하기 위해 테스트를 실행합니다:
   ```bash
   npm test
   ```

5. Package the extension into a VSIX file:
   확장 프로그램을 VSIX 파일로 패키징합니다:
   ```bash
   npm run package
   ```


## 💡 Usage / 사용법

Once installed, it automatically registers its tools via MCP. You can also trigger re-indexing manually from the command palette:
설치가 완료되면 MCP를 통해 도구가 자동으로 등록됩니다. 또한 명령 팔레트에서 수동으로 재색인 작업을 트리거할 수 있습니다:

- `Graph MCP: Build Index`
- `Graph MCP: Rebuild Index`
- `Graph MCP: Clear Cache`

No external dependencies like Python runtimes, Graphify CLI, or Docker required! It works out-of-the-box.
Python 런타임, Graphify CLI 또는 Docker와 같은 외부 종속성이 필요하지 않습니다! 설치 후 즉시 작동합니다.

## 📄 License / 라이선스

This project is licensed under the MIT License - see the LICENSE file for details.
이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다 - 자세한 내용은 LICENSE 파일을 참조하세요.
