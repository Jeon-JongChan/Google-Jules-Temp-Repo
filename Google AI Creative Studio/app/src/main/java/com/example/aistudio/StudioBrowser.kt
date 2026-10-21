package com.example.aistudio

import android.util.Log
import androidx.compose.runtime.mutableStateMapOf
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoSessionSettings
import org.mozilla.geckoview.WebResponse

/** Creates one browser session per service to preserve in-session navigation and page state. */
class StudioBrowser(
    private val runtime: GeckoRuntime,
    private val onFilePrompt: (GeckoSession.PromptDelegate.FilePrompt) -> org.mozilla.geckoview.GeckoResult<GeckoSession.PromptDelegate.PromptResponse>,
    private val onDownload: (WebResponse) -> Unit
) {
    private val sessions = mutableMapOf<StudioTab, GeckoSession>()
    val status = mutableStateMapOf<StudioTab, String>()
    val progress = mutableStateMapOf<StudioTab, Int>()
    private val desktopTabs = mutableSetOf<StudioTab>()

    fun sessionFor(tab: StudioTab): GeckoSession {
        require(tab.url != null)
        return sessions.getOrPut(tab) {
            GeckoSession().apply {
                setContentDelegate(object : GeckoSession.ContentDelegate {
                    override fun onExternalResponse(session: GeckoSession, response: WebResponse) {
                        onDownload(response)
                    }
                })
                setProgressDelegate(object : GeckoSession.ProgressDelegate {
                    override fun onPageStart(session: GeckoSession, url: String) {
                        status[tab] = "로드 중"
                    }
                    override fun onPageStop(session: GeckoSession, success: Boolean) {
                        status[tab] = if (success) "페이지 로드 완료 (서비스 기능은 별도 확인)" else "페이지 로드 실패"
                    }
                    override fun onProgressChange(session: GeckoSession, value: Int) {
                        progress[tab] = value
                    }
                })
                setPromptDelegate(object : GeckoSession.PromptDelegate {
                    override fun onFilePrompt(
                        session: GeckoSession,
                        prompt: GeckoSession.PromptDelegate.FilePrompt
                    ): org.mozilla.geckoview.GeckoResult<GeckoSession.PromptDelegate.PromptResponse> = onFilePrompt(prompt)
                })
                open(runtime)
                loadUri(tab.url!!)
            }
        }
    }

    fun reload(tab: StudioTab) {
        sessionFor(tab).reload()
    }

    /** Display preference only. Does not bypass Vids mobile editing restrictions. */
    fun toggleDesktopMode(tab: StudioTab): Boolean {
        val session = sessionFor(tab)
        val isDesktop = if (tab in desktopTabs) {
            desktopTabs.remove(tab)
            false
        } else {
            desktopTabs.add(tab)
            true
        }
        session.settings.userAgentMode = if (isDesktop) {
            GeckoSessionSettings.USER_AGENT_MODE_DESKTOP
        } else {
            GeckoSessionSettings.USER_AGENT_MODE_MOBILE
        }
        session.settings.viewportMode = if (isDesktop) {
            GeckoSessionSettings.VIEWPORT_MODE_DESKTOP
        } else {
            GeckoSessionSettings.VIEWPORT_MODE_MOBILE
        }
        session.reload()
        Log.i("AIStudio", "Desktop preference on $tab: $isDesktop")
        return isDesktop
    }

    fun back(tab: StudioTab) {
        sessions[tab]?.goBack()
    }

    fun release() {
        sessions.values.forEach { session ->
            runCatching { session.close() }
        }
        sessions.clear()
    }
}

enum class StudioTab(val title: String, val url: String?) {
    FLOW("Flow", "https://flow.google.com/"),
    MUSIC("Flow Music", "https://www.flowmusic.app/"),
    VIDS("Vids", "https://vids.new/"),
    LIBRARY("보관함", null)
}
