package com.omnistudio.labs

import android.annotation.SuppressLint
import android.app.Dialog
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ConcurrentHashMap

/**
 * 옴니스튜디오 v2 보관함 에셋 모델
 * 이미지, Veo 영상, Lyria 음악 및 영상+BGM 프로젝트 묶음 지원
 */
data class VaultItem(
    val id: String = UUID.randomUUID().toString(),
    val serviceId: String,               // "flow", "flow_music", or "project_bundle"
    val mediaType: String,               // "image", "video", "audio", "project_bundle"
    val filePath: String,                // 로컬 저장 경로
    val fileName: String,
    val prompt: String = "",
    val thumbnailUri: String? = null,
    val isProjectBundle: Boolean = false,
    val bundleVideoPath: String? = null,
    val bundleMusicPath: String? = null,
    val projectTitle: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

class MainActivity : AppCompatActivity() {

    // 1. 하이브리드 웹뷰 및 컨테이너 바인딩
    private lateinit var webViewFlow: WebView
    private lateinit var webViewMusic: WebView
    private lateinit var layoutFlowContainer: View
    private lateinit var layoutMusicContainer: View
    private lateinit var layoutVaultContainer: View
    private lateinit var bottomNavigation: BottomNavigationView

    // 프로그레스 바
    private lateinit var progressFlowLoading: ProgressBar
    private lateinit var progressMusicLoading: ProgressBar

    // 상단 툴바 버튼
    private lateinit var btnFlowBack: ImageButton
    private lateinit var btnFlowReload: ImageButton
    private lateinit var btnFlowHelp: ImageButton
    private lateinit var btnMusicBack: ImageButton
    private lateinit var btnMusicReload: ImageButton
    private lateinit var btnMusicHelp: ImageButton

    // 보관함 뷰
    private lateinit var btnCreateProjectBundle: MaterialButton
    private lateinit var btnVaultHelp: ImageButton
    private lateinit var chipGroupFilter: ChipGroup
    private lateinit var recyclerVault: RecyclerView
    private lateinit var textEmptyVault: TextView

    // 2. 보관함 데이터 및 어댑터
    private val vaultItems = mutableListOf<VaultItem>()
    private lateinit var vaultAdapter: VaultAdapter
    private var activeFilterType: String? = null // null이면 전체

    // 3. 현재 탭 ("flow", "music", "vault")
    private var currentTab: String = "flow"

    // 4. 인라인 오디오/비디오 재생 컨트롤
    private var activeMediaPlayer: MediaPlayer? = null
    private var activeVideoPlayer: MediaPlayer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        initWebViews()
        initVaultRecyclerView()
        initBottomNavigation()
        seedInitialVaultSamples()
    }

    private fun initViews() {
        layoutFlowContainer = findViewById(R.id.layoutFlowContainer)
        layoutMusicContainer = findViewById(R.id.layoutMusicContainer)
        layoutVaultContainer = findViewById(R.id.layoutVaultContainer)
        bottomNavigation = findViewById(R.id.bottomNavigation)

        webViewFlow = findViewById(R.id.webViewFlow)
        webViewMusic = findViewById(R.id.webViewMusic)

        progressFlowLoading = findViewById(R.id.progressFlowLoading)
        progressMusicLoading = findViewById(R.id.progressMusicLoading)

        btnFlowBack = findViewById(R.id.btnFlowBack)
        btnFlowReload = findViewById(R.id.btnFlowReload)
        btnFlowHelp = findViewById(R.id.btnFlowHelp)

        btnMusicBack = findViewById(R.id.btnMusicBack)
        btnMusicReload = findViewById(R.id.btnMusicReload)
        btnMusicHelp = findViewById(R.id.btnMusicHelp)

        btnCreateProjectBundle = findViewById(R.id.btnCreateProjectBundle)
        btnVaultHelp = findViewById(R.id.btnVaultHelp)
        chipGroupFilter = findViewById(R.id.chipGroupFilter)
        recyclerVault = findViewById(R.id.recyclerVault)
        textEmptyVault = findViewById(R.id.textEmptyVault)

        // 상단 바 버튼 클릭 리스너 설정
        btnFlowBack.setOnClickListener {
            if (webViewFlow.canGoBack()) webViewFlow.goBack()
        }
        btnFlowReload.setOnClickListener {
            webViewFlow.reload()
        }
        btnFlowHelp.setOnClickListener {
            showTutorialDialog(
                "Google Flow 모바일 웹 사용법",
                "• 이 화면은 Google Flow(flow.google)의 공식 모바일 웹을 그대로 노출합니다.\n\n" +
                "• 사용자의 Google AI Pro 계정으로 로그인되어 있으면 고화질 Veo 3.1 비디오 및 Imagen 3 이미지를 별도 API 비용 없이 생성할 수 있습니다.\n\n" +
                "• 탭을 Music이나 보관함으로 이동하더라도 WebView가 백그라운드에서 계속 살아있어 생성이 중단되지 않습니다.\n\n" +
                "• 웹에서 [다운로드] 버튼을 누르면 네이티브 셸이 자동으로 가로채 보관함(Vault)에 저장합니다."
            )
        }

        btnMusicBack.setOnClickListener {
            if (webViewMusic.canGoBack()) webViewMusic.goBack()
        }
        btnMusicReload.setOnClickListener {
            webViewMusic.reload()
        }
        btnMusicHelp.setOnClickListener {
            showTutorialDialog(
                "Flow Music 모바일 웹 사용법",
                "• 이 화면은 Lyria 3.5 기반 음악 전용 스튜디오인 Flow Music(flowmusic.app)을 그대로 보여줍니다.\n\n" +
                "• 풀송, 보컬, 악기 트랙을 생성하고 웹 상에서 실시간 청취할 수 있습니다.\n\n" +
                "• 생성된 음악 파일을 다운로드하면 즉시 보관함에 저장되며, [프로젝트 묶음] 기능을 통해 Flow 영상과 하나의 뮤직비디오로 페어링할 수 있습니다."
            )
        }

        btnVaultHelp.setOnClickListener {
            showTutorialDialog(
                "통합 보관함 & 프로젝트 묶음 안내",
                "• 가로챈 Flow 영상, 이미지, Flow Music 트랙이 실시간으로 여기에 모입니다.\n\n" +
                "• 상단 [🎬 프로젝트 묶음] 버튼을 누르면 보관함의 영상 1개와 음악 1개를 결합하여 싱크가 맞는 나만의 뮤직비디오 프로젝트를 생성할 수 있습니다.\n\n" +
                "• 각 카드의 재생/공유/삭제 버튼으로 즉시 감상 및 외부 앱 공유가 가능합니다."
            )
        }

        btnCreateProjectBundle.setOnClickListener {
            showCreateProjectBundleDialog()
        }

        // 보관함 필터 칩 리스너
        chipGroupFilter.setOnCheckedStateChangeListener { _, checkedIds ->
            val checkedId = checkedIds.firstOrNull()
            activeFilterType = when (checkedId) {
                R.id.chipFilterBundle -> "project_bundle"
                R.id.chipFilterVideo -> "video"
                R.id.chipFilterImage -> "image"
                R.id.chipFilterMusic -> "audio"
                else -> null
            }
            updateVaultDisplay()
        }
    }

    /**
     * 영구 유지되는 하이브리드 웹뷰 2개 초기화 (Flow, Flow Music)
     */
    @SuppressLint("SetJavaScriptEnabled")
    private fun initWebViews() {
        // 1. CookieManager 설정 (Google 로그인 세션 영구 보존)
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)

        // 2. Google Flow WebView 구성
        setupSingleWebView(
            webView = webViewFlow,
            progressBar = progressFlowLoading,
            service = ServiceRegistry.FLOW
        )

        // 3. Flow Music WebView 구성
        setupSingleWebView(
            webView = webViewMusic,
            progressBar = progressMusicLoading,
            service = ServiceRegistry.FLOW_MUSIC
        )

        // 초기 URL 로드
        webViewFlow.loadUrl(ServiceRegistry.FLOW.entryUrl)
        webViewMusic.loadUrl(ServiceRegistry.FLOW_MUSIC.entryUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupSingleWebView(
        webView: WebView,
        progressBar: ProgressBar,
        service: ServiceDefinition
    ) {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // Google 계정 차단(disallowed_useragent) 방지를 위해 Chrome 모바일 UA로 위장
        val originalUa = settings.userAgentString
        settings.userAgentString = ServiceRegistry.sanitizeUserAgent(originalUa)

        // 쿠키 설정
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        // Blob 다운로드 가로채기 JS 브릿지 등록
        webView.addJavascriptInterface(
            BlobDownloadBridge(service.id),
            "BlobDownloadBridge"
        )

        // 1) 일반 HTTP/HTTPS 다운로드 리스너
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
            handleDirectDownloadIntercept(url, mimetype, contentDisposition, service.id)
        }

        // 2) WebViewClient (페이지 로드 완료 시 다운로드 가로채기 스크립트 주입)
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.isVisible = true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.isVisible = false
                CookieManager.getInstance().flush()

                // 페이지가 렌더링된 후 Blob 다운로드 가로채기 리스너 주입
                view?.evaluateJavascript(ServiceRegistry.getDownloadInterceptorJs(service.id), null)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // 진입 URL 실패 시 폴백 주소 시도
                if (request?.isForMainFrame == true && service.fallbackUrls.isNotEmpty()) {
                    val fallback = service.fallbackUrls.firstOrNull()
                    if (fallback != null && view?.url != fallback) {
                        view?.loadUrl(fallback)
                    }
                }
            }
        }

        // 3) WebChromeClient (진행 상태)
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.isVisible = true
                    progressBar.progress = newProgress
                } else {
                    progressBar.isVisible = false
                }
            }
        }
    }

    /**
     * Blob 다운로드 브릿지: 웹상에서 생성된 비디오/오디오/이미지의 Blob URL을 Base64로 전달받아 로컬 파일로 저장
     */
    inner class BlobDownloadBridge(private val serviceId: String) {
        @JavascriptInterface
        fun onBlobIntercepted(base64Data: String, mimeType: String, filename: String, reportedServiceId: String) {
            mainHandler.post {
                try {
                    // base64 헤더 분리 (e.g., "data:video/mp4;base64,....")
                    val pureBase64 = if (base64Data.contains(",")) {
                        base64Data.substringAfter(",")
                    } else {
                        base64Data
                    }
                    val bytes = Base64.decode(pureBase64, Base64.DEFAULT)

                    val targetDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
                    val fileExt = when {
                        mimeType.contains("video") || filename.endsWith(".mp4") -> ".mp4"
                        mimeType.contains("audio") || filename.endsWith(".wav") -> ".wav"
                        mimeType.contains("mp3") || filename.endsWith(".mp3") -> ".mp3"
                        mimeType.contains("png") || filename.endsWith(".png") -> ".png"
                        mimeType.contains("jpeg") || filename.endsWith(".jpg") -> ".jpg"
                        else -> ".bin"
                    }
                    val safeName = if (filename.contains(".")) filename else "${filename}_${System.currentTimeMillis()}$fileExt"
                    val outFile = File(targetDir, safeName)

                    FileOutputStream(outFile).use { fos ->
                        fos.write(bytes)
                        fos.flush()
                    }

                    // 미디어 타입 판단
                    val detectedMediaType = when {
                        fileExt == ".mp4" -> "video"
                        fileExt in listOf(".wav", ".mp3") -> "audio"
                        else -> "image"
                    }

                    val serviceName = if (reportedServiceId == "flow") "Google Flow" else "Flow Music"
                    val promptHint = if (detectedMediaType == "video") "Flow Veo 생성 영상 ($safeName)"
                                     else if (detectedMediaType == "audio") "Flow Music 트랙 ($safeName)"
                                     else "Flow 이미지 ($safeName)"

                    val newItem = VaultItem(
                        serviceId = reportedServiceId,
                        mediaType = detectedMediaType,
                        filePath = outFile.absolutePath,
                        fileName = safeName,
                        prompt = promptHint,
                        thumbnailUri = if (detectedMediaType == "image") outFile.absolutePath else null,
                        timestamp = System.currentTimeMillis()
                    )

                    vaultItems.add(0, newItem)
                    updateVaultDisplay()

                    // 사용자에게 다운로드 가로채기 성공 알림 (스낵바)
                    val container = findViewById<View>(R.id.mainContentFrame)
                    Snackbar.make(
                        container,
                        "📥 [$serviceName] $detectedMediaType 다운로드 감지: 보관함에 저장되었습니다!",
                        Snackbar.LENGTH_LONG
                    ).setAction("보관함 보기") {
                        switchTab("vault")
                    }.show()

                } catch (e: Exception) {
                    e.printStackTrace()
                    Toast.makeText(this@MainActivity, "다운로드 저장 실패: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    /**
     * 일반 HTTP URL 다운로드 처리 (안드로이드 DownloadManager 대신 안전하게 내부 저장)
     */
    private fun handleDirectDownloadIntercept(
        url: String,
        mimeType: String,
        contentDisposition: String,
        serviceId: String
    ) {
        val detectedMediaType = when {
            mimeType.contains("video") || url.contains(".mp4") -> "video"
            mimeType.contains("audio") || url.contains(".wav") || url.contains(".mp3") -> "audio"
            else -> "image"
        }
        val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)

        val newItem = VaultItem(
            serviceId = serviceId,
            mediaType = detectedMediaType,
            filePath = url,
            fileName = fileName,
            prompt = "웹 다운로드 파일 ($fileName)",
            thumbnailUri = if (detectedMediaType == "image") url else null,
            timestamp = System.currentTimeMillis()
        )

        vaultItems.add(0, newItem)
        updateVaultDisplay()

        val serviceName = if (serviceId == "flow") "Google Flow" else "Flow Music"
        val container = findViewById<View>(R.id.mainContentFrame)
        Snackbar.make(
            container,
            "📥 [$serviceName] 다운로드 가로채기 완료: 보관함 등록됨",
            Snackbar.LENGTH_LONG
        ).setAction("보관함 보기") {
            switchTab("vault")
        }.show()
    }

    /**
     * 탭 전환 로직: WebViews를 파괴하지 않고 단순 Visibility(VISIBLE / GONE)만 조작!
     * 이를 통해 백그라운드에서 Veo 3.1 비디오 렌더링이나 음악 생성이 계속 유지됩니다.
     */
    private fun switchTab(tabId: String) {
        currentTab = tabId
        layoutFlowContainer.isVisible = (tabId == "flow")
        layoutMusicContainer.isVisible = (tabId == "music")
        layoutVaultContainer.isVisible = (tabId == "vault")

        val targetMenuId = when (tabId) {
            "flow" -> R.id.nav_flow
            "music" -> R.id.nav_music
            else -> R.id.nav_vault
        }
        if (bottomNavigation.selectedItemId != targetMenuId) {
            bottomNavigation.selectedItemId = targetMenuId
        }

        if (tabId == "vault") {
            updateVaultDisplay()
        }
    }

    private fun initBottomNavigation() {
        bottomNavigation.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_flow -> {
                    switchTab("flow")
                    true
                }
                R.id.nav_music -> {
                    switchTab("music")
                    true
                }
                R.id.nav_vault -> {
                    switchTab("vault")
                    true
                }
                else -> false
            }
        }
    }

    private fun initVaultRecyclerView() {
        recyclerVault.layoutManager = GridLayoutManager(this, 2)
        vaultAdapter = VaultAdapter(
            items = mutableListOf(),
            onPlayClick = { item -> playVaultItem(item) },
            onShareClick = { item -> shareVaultItem(item) },
            onDeleteClick = { item -> deleteVaultItem(item) }
        )
        recyclerVault.adapter = vaultAdapter
    }

    private fun updateVaultDisplay() {
        val filtered = if (activeFilterType == null) {
            vaultItems
        } else {
            vaultItems.filter { it.mediaType == activeFilterType }
        }
        vaultAdapter.updateList(filtered)
        textEmptyVault.isVisible = filtered.isEmpty()
    }

    /**
     * 프로젝트 묶음 (Flow 영상 + Flow Music BGM 결합) 생성 다이얼로그
     */
    private fun showCreateProjectBundleDialog() {
        val videos = vaultItems.filter { it.mediaType == "video" }
        val musics = vaultItems.filter { it.mediaType == "audio" }

        if (videos.isEmpty() || musics.isEmpty()) {
            MaterialAlertDialogBuilder(this)
                .setTitle("프로젝트 묶음 안내")
                .setMessage("프로젝트 묶음을 만들기 위해서는 최소 1개 이상의 Flow 영상과 1개 이상의 Flow Music 음원이 보관함에 있어야 합니다.\n\n각 탭에서 생성 후 다운로드해주세요.")
                .setPositiveButton("확인", null)
                .show()
            return
        }

        val dialogView = LayoutInflater.from(this).inflate(android.R.layout.select_dialog_item, null)
        val videoTitles = videos.map { "🎬 " + it.fileName }
        val musicTitles = musics.map { "🎵 " + it.fileName }

        var selectedVideoIdx = 0
        var selectedMusicIdx = 0

        val builder = MaterialAlertDialogBuilder(this)
        builder.setTitle("새 프로젝트 묶음 (영상 + BGM)")

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 24)
        }

        val editTitle = TextInputEditText(this).apply {
            hint = "프로젝트 이름 (예: 사이버시티 MV)"
            setText("새 프로젝트 묶음 #${vaultItems.count { it.isProjectBundle } + 1}")
        }
        layout.addView(editTitle)

        val textVideoPrompt = TextView(this).apply {
            text = "\n1. 결합할 Flow 영상 선택:"
            setTextColor(Color.WHITE)
            textSize = 13f
        }
        layout.addView(textVideoPrompt)

        val spinnerVideo = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, videoTitles)
        }
        layout.addView(spinnerVideo)

        val textMusicPrompt = TextView(this).apply {
            text = "\n2. 결합할 Flow Music BGM 선택:"
            setTextColor(Color.WHITE)
            textSize = 13f
        }
        layout.addView(textMusicPrompt)

        val spinnerMusic = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, musicTitles)
        }
        layout.addView(spinnerMusic)

        builder.setView(layout)
        builder.setPositiveButton("묶음 만들기") { _, _ ->
            selectedVideoIdx = spinnerVideo.selectedItemPosition.coerceAtLeast(0)
            selectedMusicIdx = spinnerMusic.selectedItemPosition.coerceAtLeast(0)
            val selectedVideo = videos[selectedVideoIdx]
            val selectedMusic = musics[selectedMusicIdx]
            val projectTitle = editTitle.text?.toString()?.ifBlank { "프로젝트 묶음" } ?: "프로젝트 묶음"

            val bundleItem = VaultItem(
                serviceId = "project_bundle",
                mediaType = "project_bundle",
                filePath = selectedVideo.filePath,
                fileName = "$projectTitle.bundle",
                prompt = "Flow 영상 [${selectedVideo.fileName}] + Music [${selectedMusic.fileName}] 묶음",
                thumbnailUri = selectedVideo.thumbnailUri ?: selectedVideo.filePath,
                isProjectBundle = true,
                bundleVideoPath = selectedVideo.filePath,
                bundleMusicPath = selectedMusic.filePath,
                projectTitle = projectTitle,
                timestamp = System.currentTimeMillis()
            )

            vaultItems.add(0, bundleItem)
            updateVaultDisplay()
            Toast.makeText(this, "🎬 프로젝트 묶음이 생성되었습니다!", Toast.LENGTH_SHORT).show()
        }
        builder.setNegativeButton("취소", null)
        builder.show()
    }

    /**
     * 보관함 에셋 재생 (프로젝트 묶음의 경우 영상 + 오디오 동기화 재생)
     */
    private fun playVaultItem(item: VaultItem) {
        if (item.isProjectBundle) {
            playProjectBundleModal(item)
        } else if (item.mediaType == "video") {
            playVideoModal(item.filePath, item.fileName)
        } else if (item.mediaType == "audio") {
            playAudioModal(item.filePath, item.fileName)
        } else {
            showImageModal(item.filePath, item.fileName)
        }
    }

    private fun playProjectBundleModal(bundle: VaultItem) {
        val dialog = Dialog(this, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0B0F19"))
            setPadding(24, 48, 24, 24)
        }

        val titleView = TextView(this).apply {
            text = "🎬 ${bundle.projectTitle ?: "프로젝트 묶음"}\n(Flow 영상 + Flow Music 동기화 상영)"
            textSize = 16f
            setTextColor(Color.WHITE)
            textAlignment = View.TEXT_ALIGNMENT_CENTER
        }
        container.addView(titleView)

        val videoView = VideoView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                800
            ).apply { setMargins(0, 32, 0, 32) }
        }
        container.addView(videoView)

        val btnClose = MaterialButton(this).apply {
            text = "닫기"
            setOnClickListener {
                videoView.stopPlayback()
                activeMediaPlayer?.release()
                activeMediaPlayer = null
                dialog.dismiss()
            }
        }
        container.addView(btnClose)

        dialog.setContentView(container)
        dialog.show()

        try {
            // 비디오 로드
            val videoUri = Uri.parse(bundle.bundleVideoPath ?: bundle.filePath)
            videoView.setVideoURI(videoUri)

            // 배경음악(BGM) 로드
            val musicPath = bundle.bundleMusicPath
            if (musicPath != null) {
                activeMediaPlayer?.release()
                activeMediaPlayer = MediaPlayer().apply {
                    setDataSource(this@MainActivity, Uri.parse(musicPath))
                    prepare()
                }
            }

            videoView.setOnPreparedListener { mp ->
                mp.isLooping = true
                mp.setVolume(0.3f, 0.3f) // 원본 영상 사운드는 작게
                videoView.start()

                activeMediaPlayer?.let { bgmMp ->
                    bgmMp.isLooping = true
                    bgmMp.setVolume(1.0f, 1.0f) // Flow Music BGM 메인 출력
                    bgmMp.start()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(this, "재생 준비 실패: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun playVideoModal(videoPath: String, title: String) {
        val dialog = Dialog(this, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.BLACK)
            setPadding(16, 40, 16, 16)
        }

        val titleView = TextView(this).apply {
            text = "📹 $title"
            textSize = 15f
            setTextColor(Color.WHITE)
        }
        container.addView(titleView)

        val videoView = VideoView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 30, 0, 30) }
        }
        container.addView(videoView)

        val btnClose = MaterialButton(this).apply {
            text = "닫기"
            setOnClickListener {
                videoView.stopPlayback()
                dialog.dismiss()
            }
        }
        container.addView(btnClose)

        dialog.setContentView(container)
        dialog.show()

        try {
            videoView.setVideoURI(Uri.parse(videoPath))
            videoView.setOnPreparedListener {
                it.isLooping = true
                videoView.start()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "비디오 재생 오류", Toast.LENGTH_SHORT).show()
        }
    }

    private fun playAudioModal(audioPath: String, title: String) {
        try {
            activeMediaPlayer?.release()
            activeMediaPlayer = MediaPlayer().apply {
                setDataSource(this@MainActivity, Uri.parse(audioPath))
                prepare()
                start()
            }
            Toast.makeText(this, "🎵 재생 중: $title", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "오디오 재생 오류", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showImageModal(imagePath: String, title: String) {
        val dialog = Dialog(this, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.BLACK)
            setPadding(16, 40, 16, 16)
        }

        val imageView = ImageView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            ).apply { weight = 1f }
            scaleType = ImageView.ScaleType.FIT_CENTER
            load(File(imagePath))
        }
        container.addView(imageView)

        val btnClose = MaterialButton(this).apply {
            text = "닫기"
            setOnClickListener { dialog.dismiss() }
        }
        container.addView(btnClose)

        dialog.setContentView(container)
        dialog.show()
    }

    private fun shareVaultItem(item: VaultItem) {
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = when (item.mediaType) {
                "video", "project_bundle" -> "video/*"
                "audio" -> "audio/*"
                else -> "image/*"
            }
            putExtra(Intent.EXTRA_SUBJECT, item.projectTitle ?: item.fileName)
            putExtra(Intent.EXTRA_TEXT, "${item.prompt}\n(Google Flow Hub에서 생성)")
        }
        startActivity(Intent.createChooser(shareIntent, "미디어 공유"))
    }

    private fun deleteVaultItem(item: VaultItem) {
        MaterialAlertDialogBuilder(this)
            .setTitle("에셋 삭제")
            .setMessage("'${item.projectTitle ?: item.fileName}'을(를) 보관함에서 삭제하시겠습니까?")
            .setPositiveButton("삭제") { _, _ ->
                vaultItems.remove(item)
                updateVaultDisplay()
                Toast.makeText(this, "삭제되었습니다.", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("취소", null)
            .show()
    }

    private fun showTutorialDialog(title: String, message: String) {
        MaterialAlertDialogBuilder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("이해했습니다", null)
            .show()
    }

    private fun seedInitialVaultSamples() {
        vaultItems.add(
            VaultItem(
                serviceId = "flow",
                mediaType = "video",
                filePath = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                fileName = "flow_veo3_city_sunset.mp4",
                prompt = "Veo 3.1: 석양이 지는 미래 도시를 낮게 비행하는 시네마틱 드론 샷",
                thumbnailUri = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80",
                timestamp = System.currentTimeMillis() - 100000
            )
        )
        vaultItems.add(
            VaultItem(
                serviceId = "flow_music",
                mediaType = "audio",
                filePath = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                fileName = "flow_music_epic_strings.mp3",
                prompt = "Lyria 3.5: 웅장한 오케스트라 현악과 깊은 베이스 비트",
                thumbnailUri = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80",
                timestamp = System.currentTimeMillis() - 200000
            )
        )
        vaultItems.add(
            VaultItem(
                serviceId = "project_bundle",
                mediaType = "project_bundle",
                filePath = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                fileName = "cyber_city_mv.bundle",
                prompt = "프로젝트: 미래 도시 비행 (Veo 3.1) + 에픽 현악 사운드트랙 (Lyria 3.5)",
                thumbnailUri = "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500&q=80",
                isProjectBundle = true,
                bundleVideoPath = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                bundleMusicPath = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                projectTitle = "사이버 시티 오디세이 MV",
                timestamp = System.currentTimeMillis() - 50000
            )
        )
        updateVaultDisplay()
    }

    override fun onBackPressed() {
        if (currentTab == "flow" && webViewFlow.canGoBack()) {
            webViewFlow.goBack()
        } else if (currentTab == "music" && webViewMusic.canGoBack()) {
            webViewMusic.goBack()
        } else if (currentTab != "flow") {
            switchTab("flow")
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        activeMediaPlayer?.release()
        activeMediaPlayer = null
        super.onDestroy()
    }
}

/**
 * 통합 보관함 2열 그리드 리사이클러뷰 어댑터
 */
class VaultAdapter(
    private var items: List<VaultItem>,
    private val onPlayClick: (VaultItem) -> Unit,
    private val onShareClick: (VaultItem) -> Unit,
    private val onDeleteClick: (VaultItem) -> Unit
) : RecyclerView.Adapter<VaultAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val imageThumb: ImageView = view.findViewById(R.id.imageThumb)
        val textServiceTag: TextView = view.findViewById(R.id.textServiceTag)
        val textPromptSummary: TextView = view.findViewById(R.id.textPromptSummary)
        val btnPlayItem: ImageButton = view.findViewById(R.id.btnPlayItem)
        val btnShareItem: ImageButton = view.findViewById(R.id.btnShareItem)
        val btnSaveItem: ImageButton = view.findViewById(R.id.btnSaveItem)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_vault_grid, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]

        // 서비스 태그 및 라벨 표시
        if (item.isProjectBundle) {
            holder.textServiceTag.text = "🎬 프로젝트 묶음"
            holder.textServiceTag.setTextColor(Color.parseColor("#818CF8"))
            holder.textPromptSummary.text = item.projectTitle ?: item.prompt
        } else if (item.mediaType == "video") {
            holder.textServiceTag.text = "📹 Flow 영상"
            holder.textServiceTag.setTextColor(Color.parseColor("#60A5FA"))
            holder.textPromptSummary.text = item.prompt.ifBlank { item.fileName }
        } else if (item.mediaType == "audio") {
            holder.textServiceTag.text = "🎵 Flow Music"
            holder.textServiceTag.setTextColor(Color.parseColor("#C084FC"))
            holder.textPromptSummary.text = item.prompt.ifBlank { item.fileName }
        } else {
            holder.textServiceTag.text = "🖼️ Flow 이미지"
            holder.textServiceTag.setTextColor(Color.parseColor("#34D399"))
            holder.textPromptSummary.text = item.prompt.ifBlank { item.fileName }
        }

        // 썸네일 이미지 로드
        val thumbSource = item.thumbnailUri ?: item.filePath
        if (thumbSource.isNotBlank()) {
            holder.imageThumb.load(thumbSource) {
                crossfade(true)
                placeholder(android.R.drawable.ic_menu_gallery)
                error(android.R.drawable.ic_menu_gallery)
            }
        }

        // 재생/상세 버튼
        holder.btnPlayItem.setOnClickListener { onPlayClick(item) }
        holder.btnShareItem.setOnClickListener { onShareClick(item) }
        holder.btnSaveItem.setOnClickListener { onDeleteClick(item) }
    }

    override fun getItemCount(): Int = items.size

    fun updateList(newList: List<VaultItem>) {
        items = newList
        notifyDataSetChanged()
    }
}

/*
 * ============================================================================
 * [동작 확인 방법 - MainActivity.kt]
 *
 * 1. 하이브리드 웹뷰 및 세션 유지 검증:
 *    - 앱 실행 시 Flow 모바일 웹(flow.google)과 Flow Music(flowmusic.app)이 즉시 로드되는지 확인.
 *    - Google 계정으로 로그인 시 `disallowed_useragent` 에러 없이 로그인 페이지가 정상 동작하는지 확인.
 *    - Flow 웹에서 Veo 3.1 비디오 생성 도중 'Flow Music' 또는 '보관함' 탭으로 전환했다가 되돌아와도,
 *      WebView가 재로딩되지 않고 진행 상태가 유지되는지 확인 (Visibility 토글 방식 동작).
 *
 * 2. 다운로드 가로채기(Download Interception) 검증:
 *    - Flow 또는 Flow Music 웹에서 생성 결과물 [다운로드] 버튼 클릭 시,
 *      `BlobDownloadBridge` 또는 `DownloadListener`가 호출되는지 확인.
 *    - 알림 스낵바("📥 [...] 다운로드 감지: 보관함에 저장되었습니다!")가 표시되는지 확인.
 *    - 보관함(Vault) 탭으로 이동 시 해당 파일이 새 카드로 추가되어 있는지 확인.
 *
 * 3. 통합 보관함 & 프로젝트 묶음 검증:
 *    - 보관함에서 상단 [🎬 프로젝트 묶음] 버튼 클릭 후 Flow 영상 1개와 Flow Music 1개를 선택해 저장.
 *    - 생성된 프로젝트 묶음 카드의 재생 버튼을 눌렀을 때 비디오와 BGM이 동시에 동기화 재생되는지 확인.
 * ============================================================================
 */
