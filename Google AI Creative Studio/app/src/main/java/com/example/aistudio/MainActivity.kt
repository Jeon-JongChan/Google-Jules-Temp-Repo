package com.example.aistudio

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.WebResponse

class MainActivity : ComponentActivity() {
    private lateinit var library: MediaLibrary
    private lateinit var runtime: GeckoRuntime
    private lateinit var browser: StudioBrowser

    companion object {
        @Volatile private var processRuntime: GeckoRuntime? = null
    }
    val assets = mutableStateListOf<LibraryAsset>()
    val notice = mutableStateOf<String?>(null)

    private data class PendingPicker(
        val prompt: GeckoSession.PromptDelegate.FilePrompt,
        val result: GeckoResult<GeckoSession.PromptDelegate.PromptResponse>
    )
    private var pendingPicker: PendingPicker? = null

    private val mediaPicker = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNotEmpty()) importFiles(uris)
    }
    private val singleWebPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        finishWebPicker(uri?.let { listOf(it) } ?: emptyList())
    }
    private val multipleWebPicker = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        finishWebPicker(uris)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        library = MediaLibrary(this)
        refreshAssets()
        runtime = synchronized(MainActivity::class.java) {
            processRuntime ?: GeckoRuntime.create(applicationContext).also { processRuntime = it }
        }
        browser = StudioBrowser(runtime, ::requestWebFile, ::handleExternalResponse)
        // No JavaScript injection on authentication pages. Only a restrictive built-in CSS extension.
        runtime.webExtensionController
            .ensureBuiltIn("resource://android/assets/mobile-ui/", "mobile-ui@aistudio.local")
            .accept(
                { Log.i("AIStudio", "UI extension loaded: ${it.id}") },
                { e -> Log.w("AIStudio", "UI extension could not be installed", e) }
            )
        handleSharedIntent(intent)
        setContent {
            StudioTheme {
                StudioScreen(
                    browser = browser,
                    assets = assets,
                    notice = notice.value,
                    onImport = { mediaPicker.launch(arrayOf("video/*", "audio/*", "image/*")) },
                    onOpenExternal = ::openExternal,
                    onReload = browser::reload,
                    onDelete = ::deleteAsset,
                    onShare = ::shareAsset,
                    onDismissNotice = { notice.value = null }
                )
            }
        }
    }

    private fun requestWebFile(
        prompt: GeckoSession.PromptDelegate.FilePrompt
    ): GeckoResult<GeckoSession.PromptDelegate.PromptResponse> {
        pendingPicker?.let { old -> old.result.complete(old.prompt.dismiss()) }
        val result = GeckoResult<GeckoSession.PromptDelegate.PromptResponse>()
        pendingPicker = PendingPicker(prompt, result)
        val types = prompt.mimeTypes?.takeIf { it.isNotEmpty() } ?: arrayOf("*/*")
        if (prompt.type == GeckoSession.PromptDelegate.FilePrompt.Type.MULTIPLE) {
            multipleWebPicker.launch(types)
        } else {
            singleWebPicker.launch(types)
        }
        return result
    }

    private fun finishWebPicker(uris: List<Uri>) {
        val pending = pendingPicker ?: return
        pendingPicker = null
        val response = if (uris.isEmpty()) {
            pending.prompt.dismiss()
        } else if (pending.prompt.type == GeckoSession.PromptDelegate.FilePrompt.Type.MULTIPLE) {
            pending.prompt.confirm(applicationContext, uris.toTypedArray())
        } else {
            pending.prompt.confirm(applicationContext, uris.first())
        }
        pending.result.complete(response)
    }

    private fun handleExternalResponse(response: WebResponse) {
        val input = response.body
        if (input == null) {
            notice.value = "이 다운로드는 내장 브라우저에서 처리할 수 없습니다. 외부 브라우저에서 저장해 주세요."
            return
        }
        val contentType = response.headers.entries.firstOrNull { it.key.equals("content-type", true) }
            ?.value?.substringBefore(';') ?: "application/octet-stream"
        val filename = Uri.parse(response.uri).lastPathSegment
            ?.substringBefore('?')?.takeIf { it.isNotBlank() } ?: "download-${System.currentTimeMillis()}.bin"
        lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) { input.use { library.importStream(it, filename, contentType) } }
                refreshAssets()
                notice.value = "파일을 보관함에 저장했습니다."
            } catch (e: Exception) {
                notice.value = "다운로드 저장 실패: ${e.localizedMessage ?: "알 수 없는 오류"}"
            }
        }
    }

    private fun importFiles(uris: List<Uri>) {
        lifecycleScope.launch {
            var ok = 0
            withContext(Dispatchers.IO) {
                uris.forEach { uri ->
                    try {
                        library.importUri(uri)
                        ok++
                    } catch (e: Exception) {
                        Log.w("AIStudio", "Import failed", e)
                    }
                }
            }
            refreshAssets()
            notice.value = "파일 ${ok}개를 가져왔습니다."
        }
    }

    private fun refreshAssets() {
        assets.clear()
        assets.addAll(library.list())
    }

    private fun deleteAsset(asset: LibraryAsset) {
        library.delete(asset)
        refreshAssets()
    }

    private fun shareAsset(asset: LibraryAsset) {
        val file = library.fileFor(asset)
        val uri = FileProvider.getUriForFile(this, "$packageName.files", file)
        val share = Intent(Intent.ACTION_SEND).apply {
            type = asset.mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivity(Intent.createChooser(share, "파일 공유 / 다른 앱으로 전송"))
    }

    private fun openExternal(tab: StudioTab) {
        val url = tab.url ?: return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addCategory(Intent.CATEGORY_BROWSABLE)
            })
        } catch (_: ActivityNotFoundException) {
            notice.value = "웹브라우저가 설치되어 있지 않습니다."
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleSharedIntent(intent)
    }

    private fun handleSharedIntent(share: Intent?) {
        if (share == null) return
        when (share.action) {
            Intent.ACTION_SEND -> {
                @Suppress("DEPRECATION")
                val uri = share.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                if (uri != null) importFiles(listOf(uri))
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                @Suppress("DEPRECATION")
                val uris = share.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                if (!uris.isNullOrEmpty()) importFiles(uris)
            }
        }
    }

    override fun onDestroy() {
        pendingPicker?.let { it.result.complete(it.prompt.dismiss()) }
        browser.release()
        super.onDestroy()
    }
}
