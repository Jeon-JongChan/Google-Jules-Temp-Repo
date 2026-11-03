package com.omnistudio.labs

/**
 * 옴니스튜디오 v2 하이브리드 서비스 레지스트리 (Google Flow & Flow Music)
 *
 * [아키텍처 원칙]
 * 1. 하이브리드 셸 구조: 모바일 웹을 100% 그대로 노출하며, JS DOM 조종(프롬프트 주입/버튼 클릭) 등
 *    깨지기 쉬운 헤드리스 스크래핑 방식은 완전히 배제합니다.
 * 2. 영구 백그라운드 웹뷰: Flow와 Flow Music 2개 웹뷰를 각각 메모리에 상주시키고, 탭 전환 시
 *    단순히 Visibility(VISIBLE / GONE)만 전환하여 백그라운드 Veo 렌더링이나 Lyria 음악 생성이
 *    취소되거나 재로딩되지 않도록 유지합니다.
 * 3. 다운로드 가로채기(Download Interception): 웹뷰 내부의 미디어 다운로드(일반 파일 및 Blob URL)를
 *    네이티브가 가로채어 로컬 스토리지에 자동 저장하고 통합 보관함(Vault)에 자동 등록합니다.
 * 4. API 금지 및 보안: Gemini API 키나 generativelanguage SDK를 일체 사용하지 않으며,
 *    구글 계정 자격 증명은 WebView 내부의 공식 accounts.google.com을 통해서만 사용자가 직접 인증합니다.
 */
enum class MediaOutputCategory {
    VIDEO,
    IMAGE,
    AUDIO,
    PROJECT_BUNDLE
}

data class ServiceDefinition(
    val id: String,
    val displayName: String,
    val entryUrl: String,
    val fallbackUrls: List<String>,
    val primaryColorHex: String,
    val serviceTag: String,
    val supportedOutputs: List<MediaOutputCategory>
)

object ServiceRegistry {
    // 1. Google Flow (Imagen 3 이미지 + Veo 3.1 비디오 통합 웹 스튜디오)
    val FLOW = ServiceDefinition(
        id = "flow",
        displayName = "Google Flow",
        entryUrl = "https://flow.google",
        fallbackUrls = listOf(
            "https://labs.google/flow",
            "https://flow.google/app",
            "https://labs.google/fx/tools/flow"
        ),
        primaryColorHex = "#6366F1",
        serviceTag = "Google Flow",
        supportedOutputs = listOf(MediaOutputCategory.VIDEO, MediaOutputCategory.IMAGE)
    )

    // 2. Flow Music (Lyria 3.5 기반 음악 전용 웹 스튜디오)
    val FLOW_MUSIC = ServiceDefinition(
        id = "flow_music",
        displayName = "Flow Music",
        entryUrl = "https://flowmusic.app",
        fallbackUrls = listOf(
            "https://flowmusic.google",
            "https://labs.google/flowmusic",
            "https://labs.google/fx/tools/flowmusic"
        ),
        primaryColorHex = "#A855F7",
        serviceTag = "Flow Music",
        supportedOutputs = listOf(MediaOutputCategory.AUDIO)
    )

    val services: List<ServiceDefinition> = listOf(FLOW, FLOW_MUSIC)

    fun getServiceById(id: String): ServiceDefinition? {
        return services.find { it.id == id }
    }

    /**
     * 구글 로그인 시 WebView 차단(disallowed_useragent)을 방지하기 위한
     * 순수 모바일 Chrome User-Agent 정제 함수
     */
    fun sanitizeUserAgent(originalUserAgent: String): String {
        return originalUserAgent
            .replace("; wv", "")
            .replace(Regex("Version/\\d+\\.\\d+"), "")
    }

    /**
     * Blob URL 및 웹 다운로드 버튼 클릭을 가로채기 위한 경량 JavaScript 스크립트.
     * 웹 페이지의 DOM이나 프롬프트 입력을 조종하지 않고, 오직 사용자가 웹상에서
     * 결과물을 다운로드할 때 발생하는 <a> 다운로드 이벤트만 감지하여 네이티브 브릿지로 전달합니다.
     */
    fun getDownloadInterceptorJs(serviceId: String): String {
        return """
            (function() {
                if (window.__omni_download_hooked) return;
                window.__omni_download_hooked = true;
                
                document.addEventListener('click', function(e) {
                    var anchor = e.target.closest('a[download]');
                    if (anchor && anchor.href) {
                        var href = anchor.href;
                        var filename = anchor.getAttribute('download') || 'media_' + Date.now();
                        
                        if (href.startsWith('blob:') || href.startsWith('data:')) {
                            e.preventDefault();
                            fetch(href)
                                .then(function(res) { return res.blob(); })
                                .then(function(blob) {
                                    var reader = new FileReader();
                                    reader.onloadend = function() {
                                        if (window.BlobDownloadBridge) {
                                            window.BlobDownloadBridge.onBlobIntercepted(
                                                reader.result,
                                                blob.type || 'application/octet-stream',
                                                filename,
                                                '$serviceId'
                                            );
                                        }
                                    };
                                    reader.readAsDataURL(blob);
                                })
                                .catch(function(err) {
                                    console.error('Blob capture error:', err);
                                });
                        }
                    }
                }, true);
            })();
        """.trimIndent()
    }
}

/*
 * ============================================================================
 * [동작 확인 방법 - ServiceConfig.kt]
 * 1. 서비스 등록 상태 검증:
 *    - ServiceRegistry.services 목록에 Google Flow와 Flow Music 2개 서비스가 올바르게 등록되었는지 확인.
 *    - v1의 비표준 헤드리스 스크래핑 셀렉터가 완전히 제거되고 순수 웹뷰 진입 URL 및 정제 로직으로 대체되었는지 확인.
 * 2. User-Agent 정제 검증:
 *    - sanitizeUserAgent() 실행 시 '; wv' 및 'Version/4.0'이 제거되어 구글 계정 로그인(accounts.google.com)
 *      진입 시 403 disallowed_useragent 에러 없이 정상 로그인 폼이 노출되는지 확인.
 * 3. 다운로드 가로채기 JS 검증:
 *    - Flow 및 Flow Music 웹페이지에서 생성 완료 후 '다운로드' 버튼 클릭 시,
 *      해당 Blob 또는 미디어 스트림이 window.BlobDownloadBridge로 정상 라우팅되는지 확인.
 * ============================================================================
 */
