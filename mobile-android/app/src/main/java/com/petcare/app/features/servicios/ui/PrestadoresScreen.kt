package com.petcare.app.features.servicios.ui

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.features.servicios.data.remote.*
import com.petcare.app.ui.components.AvisoFormulario
import com.petcare.app.ui.components.BarraAccionFormulario
import com.petcare.app.ui.components.EncabezadoFormulario
import com.petcare.app.ui.components.FilaInterruptor
import com.petcare.app.ui.components.GrupoChips
import com.petcare.app.ui.components.SeccionFormulario
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import com.petcare.app.ui.theme.PetCareWarning
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
    val bloqueada = solicitudes.any { it.categoria == categoria && it.estado !in listOf("correccion", "rechazado") }
    val valido = datos.nombreCompleto.trim().length >= 3 && datos.numeroDocumento.trim().length >= 5 &&
        datos.telefono.trim().length >= 6 && datos.experiencia.trim().length >= 30 &&
        datos.protocolo.trim().length >= 50 && datos.direccion.isNotBlank() &&
        (categoria != "guarderia" || (capacidad.toIntOrNull() ?: 0) in 1..100)
    val puedeEnviar = !ocupado && !bloqueada && valido && consentimiento && identidad != null &&
        (categoria == "paseador" || evidencia.isNotEmpty())

    fun enviarSolicitud() {
        val identity = identidad ?: return
        val datosEnvio = datos; val categoriaEnvio = categoria; val capacidadEnvio = capacidad; val evidenciasEnvio = evidencia.toList()
        ejecutar("Solicitud enviada. Administración te contactará para revisar tu identidad y el servicio.") {
            val campos = mutableMapOf("categoria" to categoriaEnvio, "nombreCompleto" to datosEnvio.nombreCompleto, "numeroDocumento" to datosEnvio.numeroDocumento, "telefono" to datosEnvio.telefono, "experiencia" to datosEnvio.experiencia, "referencias" to datosEnvio.referencias, "protocolo" to datosEnvio.protocolo, "direccion" to datosEnvio.direccion, "consentimiento" to "true")
            if (categoriaEnvio == "guarderia") campos["capacidad"] = capacidadEnvio
            val partes = withContext(Dispatchers.IO) { listOf(partePrivada(context, identity, "identidad")) + evidenciasEnvio.map { partePrivada(context, it, "evidencia") } }
            api.solicitarPrestador(campos.mapValues { it.value.toRequestBody("text/plain".toMediaType()) }, partes)
            identidad = null; evidencia = emptyList(); consentimiento = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        EncabezadoFormulario(
            titulo = "Ofrecer un servicio",
            subtitulo = "Solicitudes, reseñas y prestadores",
            onBack = onBack
        )

        // Las tres vistas, siempre a la mano.
        GrupoChips(
            opciones = listOf("solicitudes" to "Solicitudes", "reservas" to "Reseñas", "catalogo" to "Prestadores"),
            seleccionado = vista,
            enabled = !ocupado,
            onSelect = { vista = it },
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
        )

        if (ocupado) LinearProgressIndicator(Modifier.fillMaxWidth().padding(horizontal = 20.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            error?.let { AvisoFormulario(texto = it) }
            mensaje?.let { AvisoFormulario(texto = it, esError = false) }

            when (vista) {
                "solicitudes" -> {
                    AvisoFormulario(
                        texto = "Solicitá aprobación para cada categoría. Podés seguir usando tu cuenta como dueño mientras la revisamos.",
                        esError = false
                    )

                    if (solicitudes.isNotEmpty()) {
                        Text("Tus solicitudes", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                    solicitudes.forEach { s ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, PetCareLine),
                            shape = MaterialTheme.shapes.extraLarge
                        ) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        categoriaLabel(s.categoria),
                                        modifier = Modifier.weight(1f),
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    EstadoSolicitudPill(s.estado)
                                }
                                Text(
                                    s.historial.lastOrNull()?.motivo ?: "Solicitud recibida",
                                    color = PetCareMuted,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                if (s.estado == "suspendido") {
                                    Text(
                                        "Contactá a administración para solicitar una revisión. Las nuevas reservas de esta categoría están bloqueadas.",
                                        color = PetCareError,
                                        style = MaterialTheme.typography.bodySmall
                                    )
                                }
                                if (s.estado in listOf("correccion", "rechazado")) {
                                    OutlinedButton(
                                        onClick = {
                                            categoria = s.categoria; datos = s.datos; capacidad = s.datos.capacidad?.toString() ?: ""; identidad = null; evidencia = emptyList(); consentimiento = false
                                        },
                                        shape = MaterialTheme.shapes.large
                                    ) { Text("Corregir solicitud") }
                                }
                            }
                        }
                    }

                    SeccionFormulario(
                        titulo = "Categoría",
                        iconRes = R.drawable.ic_services,
                        descripcion = "¿Qué servicio querés ofrecer?"
                    ) {
                        GrupoChips(
                            opciones = listOf("paseador", "guarderia", "peluqueria").map { it to categoriaLabel(it) },
                            seleccionado = categoria,
                            enabled = !ocupado,
                            onSelect = { categoria = it }
                        )
                        if (bloqueada) {
                            AvisoFormulario(
                                texto = "Ya tenés una solicitud para esta categoría. Consultá su estado arriba.",
                                esError = false
                            )
                        }
                    }

                    SeccionFormulario(titulo = "Tus datos", iconRes = R.drawable.ic_person, descripcion = "Como figuran en tu documento.") {
                        CampoPrestador("Nombre completo del documento", datos.nombreCompleto, 200) { datos = datos.copy(nombreCompleto = it) }
                        CampoPrestador("Número de documento", datos.numeroDocumento, 20) { datos = datos.copy(numeroDocumento = it) }
                        CampoPrestador("Teléfono para llamada de verificación", datos.telefono, 30) { datos = datos.copy(telefono = it) }
                    }

                    SeccionFormulario(titulo = "Tu experiencia", iconRes = R.drawable.ic_heart, descripcion = "Nos ayuda a evaluar tu solicitud.") {
                        CampoPrestador("Experiencia con animales (mín. 30 caracteres)", datos.experiencia, 2000, minLineas = 3) { datos = datos.copy(experiencia = it) }
                        CampoPrestador("Referencias autorizadas y contacto (opcional)", datos.referencias, 1500, minLineas = 2) { datos = datos.copy(referencias = it) }
                        CampoPrestador("Cuidados, prevención de escapes y emergencias (mín. 50 caracteres)", datos.protocolo, 2000, minLineas = 3) { datos = datos.copy(protocolo = it) }
                    }

                    // Para guardería/peluquería es la dirección del local; para paseador es un
                    // domicilio o zona de referencia (no implica que el servicio se preste ahí).
                    val direccionLabel = if (categoria == "paseador") "Zona o domicilio de referencia" else "Dirección del lugar"
                    val direccionAyuda = if (categoria == "paseador")
                        "Ej: tu domicilio o el barrio donde ofrecés el paseo — se usa para mostrarte a dueños cercanos, no implica que el servicio sea ahí."
                    else "Ej: Av. Corrientes 1234, CABA"
                    SeccionFormulario(titulo = "Lugar", iconRes = R.drawable.ic_location) {
                        CampoPrestador(direccionLabel, datos.direccion, 255, ayuda = direccionAyuda) { datos = datos.copy(direccion = it) }
                        if (categoria == "guarderia") {
                            CampoPrestador("Cantidad máxima de mascotas", capacidad, 3) { capacidad = it.filter(Char::isDigit) }
                        }
                    }

                    SeccionFormulario(
                        titulo = "Documentación",
                        iconRes = R.drawable.ic_check,
                        descripcion = "PDF, PNG o JPEG de hasta 5 MB. Son privados y se eliminan de la base activa a los 30 días; la decisión y su historial se conservan."
                    ) {
                        if (categoria == "guarderia") {
                            Text("Adjuntá fotos de accesos, cerramientos, descanso y espacios de separación.", style = MaterialTheme.typography.bodySmall, color = PetCareMuted)
                        } else if (categoria == "peluqueria") {
                            Text("Adjuntá trabajos realizados y certificados de capacitación si los tenés.", style = MaterialTheme.typography.bodySmall, color = PetCareMuted)
                        }
                        ArchivoAdjunto(
                            titulo = "Documento de identidad",
                            estado = if (identidad == null) "Sin adjuntar" else "Seleccionado",
                            adjunto = identidad != null,
                            accion = if (identidad == null) "Adjuntar" else "Cambiar",
                            enabled = !ocupado,
                            onClick = { documentoPicker.launch(arrayOf("application/pdf", "image/png", "image/jpeg")) }
                        )
                        ArchivoAdjunto(
                            titulo = "Evidencia del servicio",
                            estado = "${evidencia.size}/4 archivos",
                            adjunto = evidencia.isNotEmpty(),
                            accion = "Elegir",
                            enabled = !ocupado,
                            onClick = { evidenciaPicker.launch(arrayOf("application/pdf", "image/png", "image/jpeg")) }
                        )
                        FilaInterruptor(
                            titulo = "Autorizo la revisión y conservación de archivos por 30 días; las referencias autorizaron ser contactadas.",
                            checked = consentimiento,
                            onChange = { consentimiento = it },
                            enabled = !ocupado
                        )
                    }
                }

                "reservas" -> {
                    AvisoFormulario(
                        texto = "Confirmá que el servicio se realizó después del horario previsto. Solo podés calificar tus propias reservas completadas. Los reportes son privados.",
                        esError = false
                    )
                    if (!ocupado && reservas.isEmpty()) EstadoVacioPrestadores("Todavía no tenés reservas de servicios.")
                    reservas.forEach { r -> key(r.idTurno) {
                        var puntuacion by remember { mutableStateOf(5) }; var comentario by remember { mutableStateOf("") }; var motivo by remember { mutableStateOf("") }; var reportando by remember { mutableStateOf(false) }
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, PetCareLine),
                            shape = MaterialTheme.shapes.extraLarge
                        ) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("${r.prestador} · ${categoriaLabel(r.categoria)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("${r.mascota} · ${r.fecha} · ${r.estado}", color = PetCareMuted, style = MaterialTheme.typography.bodyMedium)
                            val termino = runCatching { SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("America/Argentina/Buenos_Aires") }.parse("${r.fecha} ${r.horaFin.take(5)}")!!.time <= System.currentTimeMillis() }.getOrDefault(false)
                            if (r.estado == "confirmado" && termino) Button(enabled = !ocupado, shape = MaterialTheme.shapes.large, onClick = { ejecutar("Servicio completado.") { api.completarServicio(r.idTurno) } }) { Text("Confirmar servicio realizado") }
                            r.resena?.let { Text("Tu reseña: ${"★".repeat(it.puntuacion)}${"☆".repeat(5 - it.puntuacion)} · ${it.comentario}", style = MaterialTheme.typography.bodyMedium) }
                            if (r.estado == "completado" && r.resena == null) {
                                Text("Dejá tu reseña", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("${"★".repeat(puntuacion)}${"☆".repeat(5 - puntuacion)}  $puntuacion de 5", color = PetCareTealDark, style = MaterialTheme.typography.titleMedium)
                                Slider(value = puntuacion.toFloat(), onValueChange = { puntuacion = it.toInt() }, valueRange = 1f..5f, steps = 3)
                                CampoPrestador("Tu experiencia (mín. 10 caracteres)", comentario, 1000, minLineas = 2) { comentario = it }
                                Button(enabled = !ocupado && comentario.trim().length >= 10, shape = MaterialTheme.shapes.large, onClick = { ejecutar("Reseña publicada.") { api.resenarServicio(r.idTurno, ResenaPrestador(puntuacion, comentario)) } }) { Text("Publicar reseña") }
                            }
                            if (r.reporte != null) Text("Reporte ${r.reporte}", color = PetCareMuted) else {
                                TextButton(onClick = { reportando = !reportando }) { Text("Reportar un problema", color = PetCareError) }
                                if (reportando) {
                                    CampoPrestador("Qué sucedió (mín. 15 caracteres)", motivo, 2000, minLineas = 3) { motivo = it }
                                    Button(enabled = !ocupado && motivo.trim().length >= 15, shape = MaterialTheme.shapes.large, onClick = { ejecutar("Reporte enviado a administración.") { api.reportarServicio(r.idTurno, mapOf("motivo" to motivo)) } }) { Text("Enviar reporte privado") }
                                }
                            }
                        } }
                    } }
                }

                else -> {
                    AvisoFormulario(
                        texto = "Prestadores aprobados. Las comprobaciones ayudan a reducir riesgos; no garantizan la conducta futura.",
                        esError = false
                    )
                    if (!ocupado && catalogo.isEmpty()) EstadoVacioPrestadores("No hay servicios aprobados publicados todavía.")
                    catalogo.forEach { sv -> Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, PetCareLine),
                        shape = MaterialTheme.shapes.extraLarge
                    ) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(sv.nombrePrestador ?: "Prestador", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Surface(color = PetCareTealSoft, shape = MaterialTheme.shapes.large) {
                            Text(categoriaLabel(sv.categoria), Modifier.padding(horizontal = 10.dp, vertical = 4.dp), color = PetCareTealDark, style = MaterialTheme.typography.labelLarge)
                        }
                        sv.descripcion?.let { Text(it, color = PetCareMuted, style = MaterialTheme.typography.bodyMedium) }
                        OutlinedButton(enabled = !ocupado, shape = MaterialTheme.shapes.large, onClick = { ejecutar { perfiles = perfiles + (sv.id to api.perfilPrestador(sv.idUsuario, sv.categoria)) } }) { Text("Ver comprobaciones y reseñas") }
                        perfiles[sv.id]?.let { p ->
                            if (p.identidadRevisada) Text("✓ Identidad revisada", color = PetCareTealDark)
                            if (p.referenciasComprobadas) Text("✓ Referencias comprobadas", color = PetCareTealDark)
                            Text("${p.serviciosCompletados} servicios completados · ${p.promedio?.let { "%.1f/5".format(it) } ?: "Sin calificaciones"}", color = PetCareMuted)
                            p.resenas.forEach { Text("${it.autor ?: "Cliente"}: ${it.puntuacion}/5\n${it.comentario}", style = MaterialTheme.typography.bodyMedium) }
                        }
                    } } }
                }
            }

            TextButton(onClick = { ejecutar { } }, enabled = !ocupado, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text("Actualizar", color = PetCareTealDark)
            }
        }

        if (vista == "solicitudes") {
            BarraAccionFormulario(
                texto = "Enviar solicitud",
                enabled = puedeEnviar,
                isLoading = ocupado,
                onClick = { enviarSolicitud() }
            )
        }
    }
}

/** Estado de una solicitud de prestador, con color según cómo va. */
@Composable
private fun EstadoSolicitudPill(estado: String) {
    val (texto, color) = when (estado) {
        "aprobado" -> "Aprobada" to PetCareTealDark
        "correccion" -> "A corregir" to PetCareWarning
        "rechazado" -> "Rechazada" to PetCareError
        "suspendido" -> "Suspendida" to PetCareError
        else -> estado.replace('_', ' ').replaceFirstChar { it.uppercase() } to PetCareMuted
    }
    Surface(color = color.copy(alpha = 0.12f), shape = MaterialTheme.shapes.small) {
        Text(texto, Modifier.padding(horizontal = 10.dp, vertical = 4.dp), color = color, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
    }
}

/** Fila para adjuntar un archivo: qué es, cómo está y el botón para elegirlo. */
@Composable
private fun ArchivoAdjunto(
    titulo: String,
    estado: String,
    adjunto: Boolean,
    accion: String,
    enabled: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = if (adjunto) PetCareTealSoft else PetCareSurfaceSoft,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, if (adjunto) PetCareTeal.copy(alpha = 0.4f) else PetCareLine)
    ) {
        Row(
            modifier = Modifier.padding(start = 14.dp, end = 6.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(titulo, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                Text(
                    estado,
                    color = if (adjunto) PetCareTealDark else PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            TextButton(onClick = onClick, enabled = enabled) { Text(accion, color = PetCareTealDark) }
        }
    }
}

@Composable
private fun EstadoVacioPrestadores(texto: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PetCareSurfaceSoft),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Text(texto, Modifier.padding(20.dp), color = PetCareMuted, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun CampoPrestador(label: String, valor: String, max: Int, ayuda: String? = null, minLineas: Int = 1, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = valor,
        onValueChange = { if (it.length <= max) onChange(it) },
        label = { Text(label) },
        supportingText = ayuda?.let { { Text(it) } },
        minLines = minLineas,
        modifier = Modifier.fillMaxWidth(),
    )
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
