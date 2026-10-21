package com.example.aistudio

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import org.mozilla.geckoview.GeckoView

private val studioColors = darkColorScheme(
    primary = Color(0xFFAEC5FF),
    onPrimary = Color(0xFF102B58),
    background = Color(0xFF10131B),
    surface = Color(0xFF171B25),
    secondaryContainer = Color(0xFF283342)
)

@Composable
fun StudioTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = studioColors, content = content)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudioScreen(
    browser: StudioBrowser,
    assets: List<LibraryAsset>,
    notice: String?,
    onImport: () -> Unit,
    onOpenExternal: (StudioTab) -> Unit,
    onReload: (StudioTab) -> Unit,
    onDelete: (LibraryAsset) -> Unit,
    onShare: (LibraryAsset) -> Unit,
    onDismissNotice: () -> Unit
) {
    var selected by remember { mutableStateOf(StudioTab.FLOW) }
    var desktopEnabled by remember { mutableStateOf(false) }
    BackHandler(enabled = selected != StudioTab.LIBRARY) {
        browser.back(selected)
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("AI Studio", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text(selected.title, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    if (selected != StudioTab.LIBRARY) {
                        IconButton(onClick = { onReload(selected) }) {
                            Icon(Icons.Default.Refresh, contentDescription = "새로고침")
                        }
                        IconButton(onClick = { onOpenExternal(selected) }) {
                            Icon(Icons.Default.OpenInBrowser, contentDescription = "공식 브라우저로 열기")
                        }
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                StudioTab.entries.forEach { tab ->
                    val icon = when (tab) {
                        StudioTab.FLOW -> Icons.Default.Movie
                        StudioTab.MUSIC -> Icons.Default.LibraryMusic
                        StudioTab.VIDS -> Icons.Default.AutoAwesome
                        StudioTab.LIBRARY -> Icons.Default.Folder
                    }
                    NavigationBarItem(
                        selected = selected == tab,
                        onClick = { selected = tab },
                        icon = { Icon(icon, contentDescription = null) },
                        label = { Text(tab.title, maxLines = 1) }
                    )
                }
            }
        }
    ) { insets ->
        Column(Modifier.fillMaxSize().padding(insets)) {
            if (notice != null) {
                Surface(color = MaterialTheme.colorScheme.secondaryContainer) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(notice, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                        OutlinedButton(onClick = onDismissNotice) { Text("닫기") }
                    }
                }
            }
            if (selected == StudioTab.LIBRARY) {
                LibraryScreen(assets, onImport, onShare, onDelete)
            } else {
                val state = browser.status[selected] ?: "웹 연결 준비"
                val progress = browser.progress[selected] ?: 0
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("$state${if (state == "로드 중") " ($progress%)" else ""}",
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2)
                    if (selected == StudioTab.VIDS) {
                        FilledTonalButton(onClick = {
                            desktopEnabled = browser.toggleDesktopMode(StudioTab.VIDS)
                        }) { Text(if (desktopEnabled) "모바일 보기" else "PC 보기") }
                    }
                }
                if (selected == StudioTab.VIDS) {
                    Text(
                        "참고: Vids는 모바일 AI 편집을 공식 지원하지 않습니다. PC 보기로 전환해도 편집 기능은 보장되지 않습니다.",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
                Box(modifier = Modifier.fillMaxSize()) {
                    AndroidView(
                        factory = { context ->
                            GeckoView(context).apply { setSession(browser.sessionFor(selected)) }
                        },
                        update = { view ->
                            val target = browser.sessionFor(selected)
                            if (view.session !== target) {
                                if (view.session != null) view.releaseSession()
                                view.setSession(target)
                            }
                        },
                        onRelease = { view -> view.releaseSession() },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }
}

@Composable
private fun LibraryScreen(
    assets: List<LibraryAsset>,
    onImport: () -> Unit,
    onShare: (LibraryAsset) -> Unit,
    onDelete: (LibraryAsset) -> Unit
) {
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Spacer(Modifier.height(8.dp))
        Text("프로젝트 파일", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(
            "생성 파일을 공유받거나 기기에서 가져오세요. Vids 자동 프로젝트 편집 연동은 지원하지 않습니다.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(12.dp))
        Button(onClick = onImport, modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Default.UploadFile, contentDescription = null)
            Text("  영상 · 음악 · 이미지 가져오기")
        }
        Spacer(Modifier.height(14.dp))
        if (assets.isEmpty()) {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("저장된 파일이 없습니다", fontWeight = FontWeight.SemiBold)
                    Text("Flow/Flow Music에서 다운로드한 파일을 가져오거나 Android 공유 메뉴에서 AI Studio를 선택하세요.",
                        style = MaterialTheme.typography.bodySmall)
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(assets, key = { it.id }) { asset ->
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
                        Column(Modifier.padding(12.dp)) {
                            Text(asset.displayName, maxLines = 2, overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                            Text("${asset.mimeType} · ${asset.bytes / 1024} KB", style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                OutlinedButton(onClick = { onShare(asset) }) {
                                    Icon(Icons.Default.Share, contentDescription = null)
                                    Text(" 공유")
                                }
                                OutlinedButton(onClick = { onDelete(asset) }) {
                                    Icon(Icons.Default.DeleteOutline, contentDescription = null)
                                    Text(" 삭제")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
