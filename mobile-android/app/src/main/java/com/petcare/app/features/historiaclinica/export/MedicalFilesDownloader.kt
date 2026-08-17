package com.petcare.app.features.historiaclinica.export

import android.content.Context
import com.petcare.app.features.auth.data.remote.RetrofitClient
import com.petcare.app.features.historiaclinica.data.remote.EventoClinicoResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException

/**
 * Descarga los archivos medicos originales (imagenes / PDF que subio la
 * veterinaria) que estan asociados a los eventos clinicos de una mascota.
 *
 * Los archivos se sirven de forma publica en el backend bajo /uploads/, por
 * lo que no requieren token de autenticacion.
 */
object MedicalFilesDownloader {

    private val client = OkHttpClient()

    /** Aplana todos los archivos adjuntos de la lista de eventos. */
    fun collectArchivos(eventos: List<EventoClinicoResponse>) =
        eventos.flatMap { it.archivos }

    /**
     * Descarga cada archivo a la cache (una subcarpeta por archivo para
     * preservar el nombre original sin colisiones) y devuelve los [File].
     */
    suspend fun downloadAll(
        context: Context,
        eventos: List<EventoClinicoResponse>
    ): List<File> = withContext(Dispatchers.IO) {
        val archivos = collectArchivos(eventos)
        val baseDir = File(context.cacheDir, "exportaciones/archivos").apply { mkdirs() }
        val host = RetrofitClient.BASE_URL.trimEnd('/')

        archivos.mapNotNull { archivo ->
            val fullUrl = host + archivo.url
            val targetDir = File(baseDir, archivo.idArchivo.toString()).apply { mkdirs() }
            val target = File(targetDir, archivo.nombreOriginal)

            try {
                val request = Request.Builder().url(fullUrl).build()
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@mapNotNull null
                    val body = response.body ?: return@mapNotNull null
                    target.outputStream().use { output ->
                        body.byteStream().use { input -> input.copyTo(output) }
                    }
                }
                target
            } catch (e: IOException) {
                null
            }
        }
    }
}
