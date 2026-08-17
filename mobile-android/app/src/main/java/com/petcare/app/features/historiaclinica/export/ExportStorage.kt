package com.petcare.app.features.historiaclinica.export

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import java.io.File

/**
 * Utilidades para persistir y compartir los archivos exportados
 * (PDF de historia clinica y archivos medicos originales).
 */
object ExportStorage {

    private fun authority(context: Context): String =
        "${context.packageName}.fileprovider"

    /**
     * Copia [source] a la carpeta publica de Descargas del dispositivo.
     * En API 29+ usa MediaStore (sin permisos); en versiones anteriores
     * escribe directamente en el directorio publico de Descargas.
     *
     * Devuelve true si se pudo guardar.
     */
    fun saveToDownloads(
        context: Context,
        source: File,
        mimeType: String
    ): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveWithMediaStore(context, source, mimeType)
        } else {
            saveLegacy(source)
        }
    }

    private fun saveWithMediaStore(
        context: Context,
        source: File,
        mimeType: String
    ): Boolean {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, source.name)
            put(MediaStore.Downloads.MIME_TYPE, mimeType)
            put(MediaStore.Downloads.IS_PENDING, 1)
        }
        val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
        val uri = resolver.insert(collection, values) ?: return false
        return try {
            resolver.openOutputStream(uri)?.use { output ->
                source.inputStream().use { input -> input.copyTo(output) }
            } ?: return false
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            true
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            false
        }
    }

    @Suppress("DEPRECATION")
    private fun saveLegacy(source: File): Boolean {
        return try {
            val downloads =
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!downloads.exists()) downloads.mkdirs()
            val target = File(downloads, source.name)
            source.inputStream().use { input ->
                target.outputStream().use { output -> input.copyTo(output) }
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    /** Intent para compartir un unico archivo mediante el selector del sistema. */
    fun buildShareIntent(context: Context, file: File, mimeType: String): Intent {
        val uri = FileProvider.getUriForFile(context, authority(context), file)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        return Intent.createChooser(send, "Compartir")
    }

    /** Intent para compartir varios archivos a la vez. */
    fun buildShareMultipleIntent(
        context: Context,
        files: List<File>,
        mimeType: String
    ): Intent {
        val uris = ArrayList(
            files.map { FileProvider.getUriForFile(context, authority(context), it) }
        )
        val send = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
            type = mimeType
            putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        return Intent.createChooser(send, "Compartir archivos medicos")
    }
}
