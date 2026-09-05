package com.petcare.app.features.servicios.ui

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.petcare.app.features.servicios.data.remote.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import retrofit2.HttpException
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** Solicitudes y reputación independientes del rol dueño: no bloquea el resto de la app. */
@Composable
fun PrestadoresScreen(api: ServiciosApi, onBack: () -> Unit, inicial: String = "solicitudes") {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var vista by remember { mutableStateOf(inicial) }
    var solicitudes by remember { mutableStateOf(emptyList<SolicitudPrestador>()) }
    var reservas by remember { mutableStateOf(emptyList<ReservaPrestador>()) }
    var catalogo by remember { mutableStateOf(emptyList<ServicioResponse>()) }
    var perfiles by remember { mutableStateOf(emptyMap<Int, PerfilPrestador>()) }
    var ocupado by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var mensaje by remember { mutableStateOf<String?>(null) }
    var categoria by remember { mutableStateOf("paseador") }
    var datos by remember { mutableStateOf(DatosPrestador()) }
    var capacidad by remember { mutableStateOf("") }
    var consentimiento by remember { mutableStateOf(false) }
    var identidad by remember { mutableStateOf<Uri?>(null) }
    var evidencia by remember { mutableStateOf(emptyList<Uri>()) }
    val documentoPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { identidad = it }
    val evidenciaPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) {
        if (it.size > 4) { error = "Podés adjuntar hasta cuatro evidencias."; evidencia = emptyList() } else evidencia = it
    }
    suspend fun cargar() {
        when (vista) {
            "solicitudes" -> solicitudes = api.solicitudesPrestador()
            "reservas" -> reservas = api.reservasPrestador()
            else -> catalogo = api.getServicios(null)
        }
    }
    fun ejecutar(texto: String? = null, action: suspend () -> Unit) {
        if (ocupado) return
        ocupado = true; error = null; mensaje = null
        scope.launch {
            try { action(); cargar(); mensaje = texto }
            catch (e: CancellationException) { throw e }
            catch (e: Exception) { error = errorPrestador(e) }
            finally { ocupado = false }
        }
    }
    LaunchedEffect(vista) {
        ocupado = true; error = null
        try { cargar() } catch (e: CancellationException) { throw e } catch (e: Exception) { error = errorPrestador(e) } finally { ocupado = false }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        TextButton(onClick = onBack) { Text("Volver") }
        Text("Prestadores y confianza", style = MaterialTheme.typography.headlineSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("solicitudes" to "Solicitudes", "reservas" to "Reseñas", "catalogo" to "Prestadores").forEach { (valor, label) ->
                TextButton(onClick = { vista = valor }, enabled = !ocupado) { Text(label) }
            }
        }
        if (ocupado) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        mensaje?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        OutlinedButton(onClick = { ejecutar { } }, enabled = !ocupado) { Text("Actualizar") }
        when (vista) {
            "solicitudes" -> {
                Text("Solicitá aprobación para cada categoría. Podés seguir usando tu cuenta como dueño mientras la revisamos.")
                solicitudes.forEach { s ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("${s.categoria}: ${s.estado}", style = MaterialTheme.typography.titleMedium)
                            Text(s.historial.lastOrNull()?.motivo ?: "Solicitud recibida")
                            if (s.estado == "suspendido") Text("Contactá a administración para solicitar una revisión. Las nuevas reservas de esta categoría están bloqueadas.")
                            if (s.estado in listOf("correccion", "rechazado")) TextButton(onClick = {
                                categoria = s.categoria; datos = s.datos; capacidad = s.datos.capacidad?.toString() ?: ""; identidad = null; evidencia = emptyList(); consentimiento = false
                            }) { Text("Corregir solicitud") }
                        }
                    }
                }
                Text("Quiero ofrecer un servicio", style = MaterialTheme.typography.titleLarge)
                Row { listOf("paseador", "guarderia", "peluqueria").forEach { c -> TextButton(onClick = { categoria = c }, enabled = !ocupado) { Text(if (c == categoria) "✓ $c" else c) } } }
                val bloqueada = solicitudes.any { it.categoria == categoria && it.estado !in listOf("correccion", "rechazado") }
                if (bloqueada) Text("Ya tenés una solicitud para esta categoría. Consultá su estado arriba.")
                CampoPrestador("Nombre completo del documento", datos.nombreCompleto, 200) { datos = datos.copy(nombreCompleto = it) }
                CampoPrestador("Número de documento", datos.numeroDocumento, 20) { datos = datos.copy(numeroDocumento = it) }
                CampoPrestador("Teléfono para llamada de verificación", datos.telefono, 30) { datos = datos.copy(telefono = it) }
                CampoPrestador("Experiencia con animales (mín. 30 caracteres)", datos.experiencia, 2000) { datos = datos.copy(experiencia = it) }
                CampoPrestador("Referencias autorizadas y contacto (opcional)", datos.referencias, 1500) { datos = datos.copy(referencias = it) }
                CampoPrestador("Cuidados, prevención de escapes y emergencias (mín. 50 caracteres)", datos.protocolo, 2000) { datos = datos.copy(protocolo = it) }
                if (categoria == "guarderia") {
                    CampoPrestador("Dirección del lugar", datos.direccion, 255) { datos = datos.copy(direccion = it) }
                    CampoPrestador("Cantidad máxima de mascotas", capacidad, 3) { capacidad = it.filter(Char::isDigit) }
                    Text("Adjuntá fotos de accesos, cerramientos, descanso y espacios de separación.")
                } else if (categoria == "peluqueria") Text("Adjuntá trabajos realizados y certificados de capacitación si los tenés.")
                OutlinedButton(onClick = { documentoPicker.launch(arrayOf("application/pdf", "image/png", "image/jpeg")) }, enabled = !ocupado) { Text(if (identidad == null) "Adjuntar documento de identidad" else "Documento seleccionado · Cambiar") }
                OutlinedButton(onClick = { evidenciaPicker.launch(arrayOf("application/pdf", "image/png", "image/jpeg")) }, enabled = !ocupado) { Text("Evidencia del servicio: ${evidencia.size}/4 archivos") }
                Text("PDF, PNG o JPEG de hasta 5 MB. Los archivos son privados y se eliminan de la base activa a los 30 días. La decisión y su historial se conservan.")
                Row { Checkbox(checked = consentimiento, onCheckedChange = { consentimiento = it }); Text("Autorizo la revisión y conservación de archivos por 30 días; las referencias autorizaron ser contactadas.") }
                val valido = datos.nombreCompleto.trim().length >= 3 && datos.numeroDocumento.trim().length >= 5 && datos.telefono.trim().length >= 6 && datos.experiencia.trim().length >= 30 && datos.protocolo.trim().length >= 50 && (categoria != "guarderia" || (datos.direccion.isNotBlank() && (capacidad.toIntOrNull() ?: 0) in 1..100))
                Button(enabled = !ocupado && !bloqueada && valido && consentimiento && identidad != null && (categoria == "paseador" || evidencia.isNotEmpty()), onClick = {
                    val identity = identidad ?: return@Button
                    val datosEnvio = datos; val categoriaEnvio = categoria; val capacidadEnvio = capacidad; val evidenciasEnvio = evidencia.toList()
                    ejecutar("Solicitud enviada. Administración te contactará para revisar tu identidad y el servicio.") {
                        val campos = mutableMapOf("categoria" to categoriaEnvio, "nombreCompleto" to datosEnvio.nombreCompleto, "numeroDocumento" to datosEnvio.numeroDocumento, "telefono" to datosEnvio.telefono, "experiencia" to datosEnvio.experiencia, "referencias" to datosEnvio.referencias, "protocolo" to datosEnvio.protocolo, "direccion" to datosEnvio.direccion, "consentimiento" to "true")
                        if (categoriaEnvio == "guarderia") campos["capacidad"] = capacidadEnvio
                        val partes = withContext(Dispatchers.IO) { listOf(partePrivada(context, identity, "identidad")) + evidenciasEnvio.map { partePrivada(context, it, "evidencia") } }
                        api.solicitarPrestador(campos.mapValues { it.value.toRequestBody("text/plain".toMediaType()) }, partes)
                        identidad = null; evidencia = emptyList(); consentimiento = false
                    }
                }) { Text("Enviar solicitud") }
            }
            "reservas" -> {
                Text("Confirmá que el servicio se realizó después del horario previsto. Solo podés calificar tus propias reservas completadas. Los reportes son privados.")
                if (!ocupado && reservas.isEmpty()) Text("Todavía no tenés reservas de servicios.")
                reservas.forEach { r -> key(r.idTurno) {
                    var puntuacion by remember { mutableStateOf(5) }; var comentario by remember { mutableStateOf("") }; var motivo by remember { mutableStateOf("") }; var reportando by remember { mutableStateOf(false) }
                    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("${r.prestador} · ${r.categoria}", style = MaterialTheme.typography.titleMedium)
                        Text("${r.mascota} · ${r.fecha} · ${r.estado}")
                        val termino = runCatching { SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("America/Argentina/Buenos_Aires") }.parse("${r.fecha} ${r.horaFin.take(5)}")!!.time <= System.currentTimeMillis() }.getOrDefault(false)
                        if (r.estado == "confirmado" && termino) Button(enabled = !ocupado, onClick = { ejecutar("Servicio completado.") { api.completarServicio(r.idTurno) } }) { Text("Confirmar servicio realizado") }
                        r.resena?.let { Text("Tu reseña: ${it.puntuacion}/5 · ${it.comentario}") }
                        if (r.estado == "completado" && r.resena == null) {
                            Text("Calificación: $puntuacion de 5")
                            Slider(value = puntuacion.toFloat(), onValueChange = { puntuacion = it.toInt() }, valueRange = 1f..5f, steps = 3)
                            CampoPrestador("Tu experiencia (mín. 10 caracteres)", comentario, 1000) { comentario = it }
                            Button(enabled = !ocupado && comentario.trim().length >= 10, onClick = { ejecutar("Reseña publicada.") { api.resenarServicio(r.idTurno, ResenaPrestador(puntuacion, comentario)) } }) { Text("Publicar reseña") }
                        }
                        if (r.reporte != null) Text("Reporte ${r.reporte}") else {
                            TextButton(onClick = { reportando = !reportando }) { Text("Reportar un problema") }
                            if (reportando) {
                                CampoPrestador("Qué sucedió (mín. 15 caracteres)", motivo, 2000) { motivo = it }
                                Button(enabled = !ocupado && motivo.trim().length >= 15, onClick = { ejecutar("Reporte enviado a administración.") { api.reportarServicio(r.idTurno, mapOf("motivo" to motivo)) } }) { Text("Enviar reporte privado") }
                            }
                        }
                    } }
                } }
            }
            else -> {
                Text("Prestadores aprobados. Las comprobaciones ayudan a reducir riesgos; no garantizan la conducta futura.")
                if (!ocupado && catalogo.isEmpty()) Text("No hay servicios aprobados publicados todavía.")
                catalogo.forEach { s -> Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${s.nombrePrestador} · ${s.categoria}", style = MaterialTheme.typography.titleMedium)
                    s.descripcion?.let { Text(it) }
                    OutlinedButton(enabled = !ocupado, onClick = { ejecutar { perfiles = perfiles + (s.id to api.perfilPrestador(s.idUsuario, s.categoria)) } }) { Text("Ver comprobaciones y reseñas") }
                    perfiles[s.id]?.let { p ->
                        if (p.identidadRevisada) Text("✓ Identidad revisada")
                        if (p.referenciasComprobadas) Text("✓ Referencias comprobadas")
                        Text("${p.serviciosCompletados} servicios completados · ${p.promedio?.let { "%.1f/5".format(it) } ?: "Sin calificaciones"}")
                        p.resenas.forEach { Text("${it.autor ?: "Cliente"}: ${it.puntuacion}/5\n${it.comentario}") }
                    }
                } } }
            }
        }
    }
}

@Composable
private fun CampoPrestador(label: String, valor: String, max: Int, onChange: (String) -> Unit) {
    OutlinedTextField(value = valor, onValueChange = { if (it.length <= max) onChange(it) }, label = { Text(label) }, modifier = Modifier.fillMaxWidth())
}

private fun partePrivada(context: Context, uri: Uri, campo: String): MultipartBody.Part {
    val mime = context.contentResolver.getType(uri) ?: throw IllegalArgumentException("No se reconoce el formato del archivo.")
    require(mime in listOf("application/pdf", "image/png", "image/jpeg")) { "Elegí un archivo PDF, PNG o JPEG." }
    val bytes = context.contentResolver.openInputStream(uri)?.use { input ->
        val output = ByteArrayOutputStream(); val buffer = ByteArray(8192); var total = 0
        while (true) { val read = input.read(buffer); if (read < 0) break; total += read; require(total <= 5 * 1024 * 1024) { "Cada archivo debe pesar como máximo 5 MB." }; output.write(buffer, 0, read) }
        output.toByteArray()
    } ?: throw IllegalArgumentException("No se pudo leer el archivo.")
    return MultipartBody.Part.createFormData(campo, "documento", bytes.toRequestBody(mime.toMediaType()))
}

private fun errorPrestador(e: Exception): String = if (e is HttpException) {
    runCatching { val json = JSONObject(e.response()?.errorBody()?.string() ?: "{}"); json.optString("mensaje").ifBlank { json.optString("message") }.ifBlank { "No se pudo completar la operación." } }.getOrDefault("No se pudo completar la operación.")
} else if (e is IllegalArgumentException) e.message ?: "Revisá los datos ingresados." else "No se pudo conectar con el servidor. Intentá nuevamente."
