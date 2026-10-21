package com.example.aistudio

import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.InputStream
import java.util.UUID

/** Local-only storage. Never reads auth cookies/tokens or contacts Google's private APIs. */
data class LibraryAsset(
    val id: String,
    val displayName: String,
    val mimeType: String,
    val localName: String,
    val createdAt: Long,
    val bytes: Long
)

class MediaLibrary(private val context: Context) {
    private val root = File(context.filesDir, "library").apply { mkdirs() }
    private val index = File(context.filesDir, "library-index.json")

    @Synchronized
    fun list(): List<LibraryAsset> {
        if (!index.exists()) return emptyList()
        return try {
            val data = JSONArray(index.readText(Charsets.UTF_8))
            (0 until data.length()).map { i ->
                data.getJSONObject(i).let { obj ->
                    LibraryAsset(
                        id = obj.getString("id"),
                        displayName = obj.getString("displayName"),
                        mimeType = obj.getString("mimeType"),
                        localName = obj.getString("localName"),
                        createdAt = obj.getLong("createdAt"),
                        bytes = obj.getLong("bytes")
                    )
                }
            }.filter { File(root, it.localName).isFile }.sortedByDescending { it.createdAt }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun persist(assets: List<LibraryAsset>) {
        val arr = JSONArray()
        assets.forEach { asset ->
            arr.put(JSONObject().apply {
                put("id", asset.id)
                put("displayName", asset.displayName)
                put("mimeType", asset.mimeType)
                put("localName", asset.localName)
                put("createdAt", asset.createdAt)
                put("bytes", asset.bytes)
            })
        }
        val temporary = File(index.parentFile, "${index.name}.tmp")
        temporary.writeText(arr.toString(), Charsets.UTF_8)
        if (!temporary.renameTo(index)) {
            index.writeText(arr.toString(), Charsets.UTF_8)
            temporary.delete()
        }
    }

    fun importUri(uri: Uri): LibraryAsset {
        val type = context.contentResolver.getType(uri) ?: "application/octet-stream"
        val name = displayName(uri) ?: "imported-${System.currentTimeMillis()}"
        val input = context.contentResolver.openInputStream(uri)
            ?: throw IllegalArgumentException("파일을 열 수 없습니다")
        return input.use { importStream(it, name, type) }
    }

    @Synchronized
    fun importStream(stream: InputStream, suggestedName: String, mimeType: String): LibraryAsset {
        val safeDisplay = suggestedName.substringAfterLast('/').substringAfterLast('\\')
            .replace(Regex("[\\p{Cntrl}]"), "").take(160).ifBlank { "media-file" }
        val id = UUID.randomUUID().toString()
        val ext = safeDisplay.substringAfterLast('.', "bin")
            .lowercase().takeIf { it.matches(Regex("[a-z0-9]{1,8}")) } ?: "bin"
        val localName = "$id.$ext"
        val file = File(root, localName)
        try {
            file.outputStream().use { out -> stream.copyTo(out) }
            val asset = LibraryAsset(id, safeDisplay, mimeType, localName, System.currentTimeMillis(), file.length())
            persist(list() + asset)
            return asset
        } catch (e: Exception) {
            file.delete()
            throw e
        }
    }

    @Synchronized
    fun delete(asset: LibraryAsset) {
        File(root, asset.localName).delete()
        persist(list().filterNot { it.id == asset.id })
    }

    fun fileFor(asset: LibraryAsset): File = File(root, asset.localName)

    private fun displayName(uri: Uri): String? {
        var cursor: Cursor? = null
        return try {
            cursor = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            if (cursor?.moveToFirst() == true) cursor.getString(0) else uri.lastPathSegment
        } catch (_: Exception) {
            uri.lastPathSegment
        } finally {
            cursor?.close()
        }
    }
}
