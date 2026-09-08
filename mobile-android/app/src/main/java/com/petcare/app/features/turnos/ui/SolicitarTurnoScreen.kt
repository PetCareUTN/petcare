package com.petcare.app.features.turnos.ui

import android.Manifest
import android.content.pm.PackageManager
import android.location.Location
import androidx.activity.compose.BackHandler
import androidx.annotation.DrawableRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.maps.model.LatLng
import com.petcare.app.R
import com.petcare.app.features.mapa.ui.MapaPrestadoresScreen
import com.petcare.app.features.mapa.ui.PinUbicacion
import com.petcare.app.features.mapa.ui.obtenerUltimaUbicacion
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.ui.PetAvatar
import com.petcare.app.features.servicios.data.remote.ServicioResponse
import com.petcare.app.features.servicios.ui.categoriaLabel
import com.petcare.app.features.turnos.data.remote.VeterinariaResponse
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import java.text.SimpleDateFormat
import java.util.Calendar
import kotlin.math.roundToInt
import java.util.Locale
import java.util.TimeZone

private enum class TipoTurno { VETERINARIA, PASEADOR, GUARDERIA, PELUQUERIA }

private fun TipoTurno.label(): String = when (this) {
    TipoTurno.VETERINARIA -> "Veterinaria"
    TipoTurno.PASEADOR -> categoriaLabel("paseador")
    TipoTurno.GUARDERIA -> categoriaLabel("guarderia")
    TipoTurno.PELUQUERIA -> categoriaLabel("peluqueria")
}

private fun TipoTurno.categoria(): String? = when (this) {
    TipoTurno.VETERINARIA -> null
    TipoTurno.PASEADOR -> "paseador"
    TipoTurno.GUARDERIA -> "guarderia"
    TipoTurno.PELUQUERIA -> "peluqueria"
}

@DrawableRes
private fun TipoTurno.icono(): Int = when (this) {
    TipoTurno.VETERINARIA -> R.drawable.ic_turno_veterinaria
    TipoTurno.PASEADOR -> R.drawable.ic_turno_paseador
    TipoTurno.GUARDERIA -> R.drawable.ic_turno_guarderia
    TipoTurno.PELUQUERIA -> R.drawable.ic_turno_peluqueria
}

// El mapa se maneja adentro de esta misma pantalla (en vez de que la
// muestre una pantalla separada en MainActivity) para que el tipo de
// turno, la mascota y el resto de la selección no se pierdan al ir y
// volver: si el mapa fuera una rama distinta del if/else de navegación,
// esta pantalla se sacaría por completo de la composición mientras se ve
// el mapa y el estado (rememberSaveable) no se restaura al volver.
private data class VistaMapaTurno(
    val titulo: String,
    val subtitulo: String,
    val pines: List<PinUbicacion>,
    val onSeleccionar: (PinUbicacion) -> Unit
)

@Composable
fun SolicitarTurnoScreen(
    pets: List<PetResponse>,
    veterinarias: List<VeterinariaResponse>,
    isLoadingVeterinarias: Boolean,
    serviciosPorCategoria: List<ServicioResponse>,
    isLoadingServiciosPorCategoria: Boolean,
    horariosDisponibles: List<String>,
    isLoadingHorariosDisponibles: Boolean,
    isSaving: Boolean,
    errorMessage: String?,
    successMessage: String?,
    onSelectCategoria: (categoria: String) -> Unit,
    onCargarHorarios: (idProveedor: Int, fecha: String, esServicio: Boolean) -> Unit,
    onSolicitarVeterinario: (
        idMascota: Int,
        idVeterinario: Int,
        fecha: String,
        hora: String,
        motivoConsulta: String?,
    ) -> Unit,
    onSolicitarServicio: (
        idMascota: Int,
        idServicio: Int,
        fecha: String,
        horaInicio: String,
        notas: String?,
    ) -> Unit,
    onBack: () -> Unit
) {
    var tipo by rememberSaveable { mutableStateOf<TipoTurno?>(null) }
    var selectedPetId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedVeterinariaId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedServicioId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedFecha by rememberSaveable { mutableStateOf("") }
    var selectedHora by rememberSaveable { mutableStateOf<String?>(null) }
    var notas by rememberSaveable { mutableStateOf("") }
    var formError by rememberSaveable { mutableStateOf<String?>(null) }
    var vistaMapa by remember { mutableStateOf<VistaMapaTurno?>(null) }

    /*
     * Ubicación propia para mostrar a qué distancia queda cada prestador. No se
     * pide el permiso acá: si ya lo dieron (por ejemplo al abrir el mapa) se usa,
     * y si no, las tarjetas simplemente no muestran la distancia.
     */
    val context = LocalContext.current
    var ubicacionPropia by remember { mutableStateOf<LatLng?>(null) }
    LaunchedEffect(Unit) {
        val tienePermiso = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

        if (tienePermiso) {
            ubicacionPropia = obtenerUltimaUbicacion(context)
        }
    }

    BackHandler(enabled = vistaMapa != null) { vistaMapa = null }

    val mapaActual = vistaMapa
    if (mapaActual != null) {
        MapaPrestadoresScreen(
            titulo = mapaActual.titulo,
            subtitulo = mapaActual.subtitulo,
            pines = mapaActual.pines,
            onBack = { vistaMapa = null },
            onSeleccionarPin = mapaActual.onSeleccionar
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "Solicitar turno",
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = "Elegí el tipo de turno, tu mascota y un horario disponible.",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyMedium
        )

        Spacer(modifier = Modifier.height(20.dp))

        if (successMessage != null) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = PetCareTealSoft,
                shape = MaterialTheme.shapes.large
            ) {
                Text(
                    text = successMessage,
                    modifier = Modifier.padding(16.dp),
                    color = PetCareTeal,
                    style = MaterialTheme.typography.bodyLarge
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onBack,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = MaterialTheme.shapes.large
            ) {
                Text("Volver")
            }
            return@Column
        }

        if (pets.isEmpty()) {
            EmptyPetsCard()
        } else {
            Text(text = "Tipo de turno", style = MaterialTheme.typography.titleSmall)
            Spacer(modifier = Modifier.height(8.dp))
            /*
             * Grilla de dos columnas: son cuatro opciones de una palabra y en
             * tarjetas de ancho completo se comian media pantalla.
             */
            TipoTurno.entries.chunked(2).forEach { fila ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    fila.forEach { opcion ->
                        ChipTipoTurno(
                            label = opcion.label(),
                            icono = opcion.icono(),
                            selected = tipo == opcion,
                            modifier = Modifier.weight(1f),
                            onClick = {
                                if (tipo != opcion) {
                                    tipo = opcion
                                    selectedVeterinariaId = null
                                    selectedServicioId = null
                                    selectedFecha = ""
                                    selectedHora = null
                                    formError = null
                                    opcion.categoria()?.let { onSelectCategoria(it) }
                                }
                            }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(text = "Mascota", style = MaterialTheme.typography.titleSmall)
            Spacer(modifier = Modifier.height(8.dp))
            // Carrusel: se ven todas de un vistazo en vez de una tarjeta por mascota.
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(pets, key = { it.id }) { pet ->
                    MascotaChip(
                        nombre = pet.nombre,
                        fotoPath = pet.foto,
                        selected = pet.id == selectedPetId,
                        onClick = {
                            selectedPetId = pet.id
                            formError = null
                        }
                    )
                }
            }

            if (tipo == TipoTurno.VETERINARIA) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(text = "Veterinaria", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))

                when {
                    isLoadingVeterinarias -> {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    veterinarias.isEmpty() -> {
                        Text(
                            text = "No hay veterinarias disponibles por el momento",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    else -> {
                        OutlinedButton(
                            onClick = {
                                vistaMapa = VistaMapaTurno(
                                    titulo = "Veterinarias",
                                    subtitulo = "Prestadores con ubicación cargada",
                                    pines = veterinarias.mapNotNull { veterinaria ->
                                        val lat = veterinaria.latitud
                                        val lng = veterinaria.longitud
                                        if (lat == null || lng == null) {
                                            null
                                        } else {
                                            PinUbicacion(
                                                id = veterinaria.idVeterinario,
                                                titulo = veterinaria.nombre,
                                                subtitulo = veterinaria.direccion,
                                                latitud = lat,
                                                longitud = lng
                                            )
                                        }
                                    },
                                    onSeleccionar = { pin ->
                                        selectedVeterinariaId = pin.id
                                        selectedFecha = ""
                                        selectedHora = null
                                        formError = null
                                        vistaMapa = null
                                    }
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large
                        ) {
                            Text("Ver en el mapa")
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        veterinarias.forEach { veterinaria ->
                            PrestadorCard(
                                nombre = veterinaria.nombre,
                                direccion = veterinaria.direccion,
                                distancia = distanciaTexto(
                                    origen = ubicacionPropia,
                                    latitud = veterinaria.latitud,
                                    longitud = veterinaria.longitud
                                ),
                                detalle = null,
                                selected = veterinaria.idVeterinario == selectedVeterinariaId,
                                onClick = {
                                    selectedVeterinariaId = veterinaria.idVeterinario
                                    selectedFecha = ""
                                    selectedHora = null
                                    formError = null
                                }
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                }
            } else if (tipo != null) {
                val categoriaTexto = tipo!!.label()
                Spacer(modifier = Modifier.height(12.dp))
                Text(text = "Prestador de $categoriaTexto", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))

                when {
                    isLoadingServiciosPorCategoria -> {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator()
                        }
                    }
                    serviciosPorCategoria.isEmpty() -> {
                        Text(
                            text = "No hay prestadores de $categoriaTexto disponibles por el momento",
                            color = PetCareMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    else -> {
                        OutlinedButton(
                            onClick = {
                                vistaMapa = VistaMapaTurno(
                                    titulo = categoriaTexto,
                                    subtitulo = "Prestadores con ubicación cargada",
                                    pines = serviciosPorCategoria.mapNotNull { servicio ->
                                        val lat = servicio.latitud
                                        val lng = servicio.longitud
                                        if (lat == null || lng == null) {
                                            null
                                        } else {
                                            PinUbicacion(
                                                id = servicio.id,
                                                titulo = servicio.nombrePrestador,
                                                subtitulo = servicio.direccion,
                                                latitud = lat,
                                                longitud = lng
                                            )
                                        }
                                    },
                                    onSeleccionar = { pin ->
                                        selectedServicioId = pin.id
                                        selectedFecha = ""
                                        selectedHora = null
                                        formError = null
                                        vistaMapa = null
                                    }
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = MaterialTheme.shapes.large
                        ) {
                            Text("Ver en el mapa")
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        serviciosPorCategoria.forEach { servicio ->
                            PrestadorCard(
                                nombre = servicio.nombrePrestador,
                                direccion = servicio.direccion ?: servicio.descripcion,
                                distancia = distanciaTexto(
                                    origen = ubicacionPropia,
                                    latitud = servicio.latitud,
                                    longitud = servicio.longitud
                                ),
                                detalle = resumenDisponibilidad(servicio),
                                selected = servicio.id == selectedServicioId,
                                onClick = {
                                    selectedServicioId = servicio.id
                                    selectedFecha = ""
                                    selectedHora = null
                                    formError = null
                                }
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                }
            }

            val proveedorElegido = when (tipo) {
                TipoTurno.VETERINARIA -> selectedVeterinariaId != null
                null -> false
                else -> selectedServicioId != null
            }

            if (proveedorElegido) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = "Fecha", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))

                val elegirFecha: (String) -> Unit = { fecha ->
                    selectedFecha = fecha
                    selectedHora = null
                    formError = null
                    val idProveedor = if (tipo == TipoTurno.VETERINARIA) {
                        selectedVeterinariaId
                    } else {
                        selectedServicioId
                    }
                    if (idProveedor != null) {
                        onCargarHorarios(idProveedor, fecha, tipo != TipoTurno.VETERINARIA)
                    }
                }

                /*
                 * Carrusel con los próximos días: la mayoría de los turnos se
                 * piden para esta semana, así se eligen de un toque. Para una
                 * fecha más lejana queda el calendario debajo.
                 */
                val dias = remember { proximosDias(14) }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(dias, key = { it.fecha }) { dia ->
                        DiaChip(
                            diaSemana = dia.diaSemana,
                            diaNumero = dia.diaNumero,
                            mes = dia.mes,
                            selected = dia.fecha == selectedFecha,
                            onClick = { elegirFecha(dia.fecha) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                TurnoDatePickerField(
                    selectedDate = selectedFecha,
                    onDateSelected = elegirFecha
                )
            }

            if (selectedFecha.isNotBlank()) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = "Horario disponible", style = MaterialTheme.typography.titleSmall)
                Spacer(modifier = Modifier.height(8.dp))

                if (isLoadingHorariosDisponibles) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (horariosDisponibles.isEmpty()) {
                    Text(
                        text = "No hay horarios disponibles para ese día",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                } else {
                    /*
                     * Separados en mañana y tarde: una lista corrida de quince
                     * horarios cuesta más de leer que dos bloques cortos.
                     */
                    val franjas = listOf(
                        "Mañana" to horariosDisponibles.filter { esAntesDelMediodia(it) },
                        "Tarde" to horariosDisponibles.filterNot { esAntesDelMediodia(it) }
                    ).filter { (_, horas) -> horas.isNotEmpty() }

                    franjas.forEach { (titulo, horas) ->
                        // Si todos los horarios caen en la misma franja, el título sobra.
                        if (franjas.size > 1) {
                            Text(
                                text = titulo,
                                color = PetCareMuted,
                                style = MaterialTheme.typography.labelLarge,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                        }

                        horas.chunked(3).forEach { fila ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            fila.forEach { hora ->
                                SlotChip(
                                    label = hora,
                                    selected = hora == selectedHora,
                                    modifier = Modifier.weight(1f),
                                    onClick = {
                                        selectedHora = hora
                                        formError = null
                                    }
                                )
                            }
                            repeat(3 - fila.size) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                }
            }

            if (selectedHora != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = if (tipo == TipoTurno.VETERINARIA) "Motivo de consulta (opcional)" else "Notas para el prestador (opcional)",
                    style = MaterialTheme.typography.titleSmall
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = notas,
                    onValueChange = { notas = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Ej: control anual, vacunación...") }
                )
            }

            val error = formError ?: errorMessage
            if (error != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = PetCareTealSoft,
                    shape = MaterialTheme.shapes.medium
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = {
                    val petId = selectedPetId
                    val hora = selectedHora
                    when {
                        tipo == null -> formError = "Elegí el tipo de turno"
                        petId == null -> formError = "Elegí una mascota"
                        tipo == TipoTurno.VETERINARIA && selectedVeterinariaId == null ->
                            formError = "Elegí una veterinaria"
                        tipo != TipoTurno.VETERINARIA && selectedServicioId == null ->
                            formError = "Elegí un prestador"
                        selectedFecha.isBlank() -> formError = "Elegí una fecha"
                        hora == null -> formError = "Elegí un horario"
                        tipo == TipoTurno.VETERINARIA -> onSolicitarVeterinario(
                            petId,
                            selectedVeterinariaId!!,
                            selectedFecha,
                            hora,
                            notas.trim().ifBlank { null }
                        )
                        else -> onSolicitarServicio(
                            petId,
                            selectedServicioId!!,
                            selectedFecha,
                            hora,
                            notas.trim().ifBlank { null }
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = !isSaving,
                shape = MaterialTheme.shapes.large
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(22.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Solicitar turno")
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        TextButton(
            onClick = onBack,
            enabled = !isSaving,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancelar")
        }
    }
}

/**
 * Los horarios vienen como "HH:mm" o "HH:mm:ss". Si el formato no fuera el
 * esperado se considera de la tarde, para no perder el horario de la lista.
 */
private fun esAntesDelMediodia(hora: String): Boolean =
    hora.substringBefore(':').trim().toIntOrNull()?.let { it < 12 } ?: false

/** Un día del selector de fechas, ya con las etiquetas listas para mostrar. */
private data class DiaOpcion(
    val fecha: String,
    val diaSemana: String,
    val diaNumero: String,
    val mes: String
)

/**
 * Los próximos [cantidad] días a partir de hoy, para elegir la fecha de un
 * toque en vez de abrir el calendario.
 */
private fun proximosDias(cantidad: Int): List<DiaOpcion> {
    val locale = Locale("es", "AR")
    val formatoFecha = SimpleDateFormat("yyyy-MM-dd", locale)
    val formatoDiaSemana = SimpleDateFormat("EEE", locale)
    val formatoDiaNumero = SimpleDateFormat("d", locale)
    val formatoMes = SimpleDateFormat("MMM", locale)

    val calendario = Calendar.getInstance()

    return (0 until cantidad).map { desplazamiento ->
        if (desplazamiento > 0) calendario.add(Calendar.DAY_OF_YEAR, 1)
        val fechaDia = calendario.time

        DiaOpcion(
            fecha = formatoFecha.format(fechaDia),
            diaSemana = formatoDiaSemana.format(fechaDia)
                .replaceFirstChar { it.uppercase() }
                .take(3),
            diaNumero = formatoDiaNumero.format(fechaDia),
            mes = formatoMes.format(fechaDia).replaceFirstChar { it.uppercase() }.take(3)
        )
    }
}

/**
 * Resumen corto de la disponibilidad para la tarjeta: cuántos días atiende y
 * en qué franja. Null si el prestador todavía no cargó horarios.
 */
private fun resumenDisponibilidad(servicio: ServicioResponse): String? {
    val disponibilidades = servicio.disponibilidades
    if (disponibilidades.isEmpty()) return null

    val dias = disponibilidades.map { it.diaSemana }.distinct().size
    val desde = disponibilidades.minOf { it.horaInicio }.take(5)
    val hasta = disponibilidades.maxOf { it.horaFin }.take(5)
    val diasTexto = if (dias == 1) "1 día" else "$dias días"

    return "$diasTexto · $desde a $hasta"
}

/**
 * Distancia en línea recta hasta el prestador, o null si falta alguna de las
 * dos ubicaciones (sin permiso de ubicación, o prestador sin geocodificar).
 */
private fun distanciaTexto(
    origen: LatLng?,
    latitud: Double?,
    longitud: Double?
): String? {
    if (origen == null || latitud == null || longitud == null) return null

    val resultado = FloatArray(1)
    Location.distanceBetween(origen.latitude, origen.longitude, latitud, longitud, resultado)
    val metros = resultado[0]

    return if (metros < 1000) {
        "a ${metros.roundToInt()} m"
    } else {
        "a ${String.format(Locale("es", "AR"), "%.1f", metros / 1000)} km"
    }
}

/**
 * Tarjeta de veterinaria o prestador: inicial en un círculo, nombre, dirección
 * y, si se puede calcular, a qué distancia queda. El detalle es opcional y lo
 * usan los servicios para mostrar el horario.
 */
@Composable
private fun PrestadorCard(
    nombre: String,
    direccion: String?,
    distancia: String?,
    detalle: String?,
    selected: Boolean,
    onClick: () -> Unit
) {
    val colorBorde = if (selected) PetCareTeal else PetCareLine
    val colorFondo = if (selected) PetCareTealSoft else MaterialTheme.colorScheme.surface

    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = colorFondo,
        border = BorderStroke(if (selected) 2.dp else 1.dp, colorBorde)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Sin foto en el modelo todavía: se muestra la inicial del nombre.
            Surface(
                modifier = Modifier.size(48.dp),
                shape = CircleShape,
                color = PetCareTealSoft
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = nombre.firstOrNull()?.uppercase() ?: "?",
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = nombre,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                direccion?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = it,
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                val pie = listOfNotNull(distancia, detalle?.takeIf { it.isNotBlank() })
                if (pie.isNotEmpty()) {
                    Text(
                        text = pie.joinToString(" · "),
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (selected) {
                Text(
                    text = "Elegida",
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

/** Opción de tipo de turno: ícono arriba y etiqueta abajo, en media columna. */
@Composable
private fun ChipTipoTurno(
    label: String,
    @DrawableRes icono: Int,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colorBorde = if (selected) PetCareTeal else PetCareLine
    val colorFondo = if (selected) PetCareTealSoft else MaterialTheme.colorScheme.surface
    val colorContenido = if (selected) PetCareTealDark else MaterialTheme.colorScheme.onSurface

    Surface(
        onClick = onClick,
        modifier = modifier.height(84.dp),
        shape = RoundedCornerShape(14.dp),
        color = colorFondo,
        border = BorderStroke(if (selected) 2.dp else 1.dp, colorBorde)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                painter = painterResource(icono),
                contentDescription = null,
                tint = colorContenido,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = label,
                color = colorContenido,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
        }
    }
}

/** Un día del carrusel de fechas: día de la semana arriba y número abajo. */
@Composable
private fun DiaChip(
    diaSemana: String,
    diaNumero: String,
    mes: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    val colorBorde = if (selected) PetCareTeal else PetCareLine
    val colorFondo = if (selected) PetCareTealSoft else MaterialTheme.colorScheme.surface
    val colorContenido = if (selected) PetCareTealDark else MaterialTheme.colorScheme.onSurface

    Surface(
        onClick = onClick,
        modifier = Modifier.size(width = 60.dp, height = 76.dp),
        shape = RoundedCornerShape(14.dp),
        color = colorFondo,
        border = BorderStroke(if (selected) 2.dp else 1.dp, colorBorde)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = diaSemana,
                color = if (selected) PetCareTealDark else PetCareMuted,
                style = MaterialTheme.typography.labelSmall
            )
            Text(
                text = diaNumero,
                color = colorContenido,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold
            )
            Text(
                text = mes,
                color = if (selected) PetCareTealDark else PetCareMuted,
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

/** Mascota del carrusel: la foto (o la inicial) y el nombre debajo. */
@Composable
private fun MascotaChip(
    nombre: String,
    fotoPath: String?,
    selected: Boolean,
    onClick: () -> Unit
) {
    val colorTexto = if (selected) PetCareTealDark else MaterialTheme.colorScheme.onSurface

    Column(
        modifier = Modifier
            .width(84.dp)
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .border(
                    width = if (selected) 3.dp else 1.dp,
                    color = if (selected) PetCareTeal else PetCareLine,
                    shape = CircleShape
                )
                .padding(if (selected) 3.dp else 1.dp)
        ) {
            PetAvatar(
                petName = nombre,
                photoPath = fotoPath,
                modifier = Modifier.fillMaxSize()
            )
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = nombre,
            color = colorTexto,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun SelectableOptionCard(
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) PetCareTealSoft else MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, if (selected) PetCareTeal else PetCareLine),
        shape = MaterialTheme.shapes.large
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                if (subtitle.isNotBlank()) {
                    Text(text = subtitle, color = PetCareMuted, style = MaterialTheme.typography.bodyMedium)
                }
            }
            if (selected) {
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Seleccionada",
                    color = PetCareTeal,
                    style = MaterialTheme.typography.labelLarge,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun SlotChip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        color = if (selected) PetCareTeal else PetCareMint,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, if (selected) PetCareTeal else PetCareLine)
    ) {
        Text(
            text = label,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            color = if (selected) MaterialTheme.colorScheme.onPrimary else PetCareTeal,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            style = MaterialTheme.typography.labelLarge
        )
    }
}

@Composable
private fun EmptyPetsCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = PetCareMint),
        border = BorderStroke(1.dp, PetCareLine),
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = "Todavía no tenés mascotas registradas",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Registrá una mascota para poder solicitar un turno.",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TurnoDatePickerField(
    selectedDate: String,
    onDateSelected: (String) -> Unit
) {
    var showPicker by remember { mutableStateOf(false) }
    val datePickerState = rememberDatePickerState(
        initialSelectedDateMillis = selectedDate.toFechaMillis(),
        selectableDates = object : androidx.compose.material3.SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long): Boolean =
                utcTimeMillis >= hoyMillis()
        }
    )

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text = "Fecha", style = MaterialTheme.typography.labelLarge)

        OutlinedButton(
            onClick = { showPicker = true },
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            border = BorderStroke(1.dp, PetCareLine)
        ) {
            Text(
                text = selectedDate.ifBlank { "Seleccionar fecha" },
                color = if (selectedDate.isBlank()) PetCareMuted else MaterialTheme.colorScheme.onSurface
            )
        }
    }

    if (showPicker) {
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let {
                            onDateSelected(it.toFechaText())
                        }
                        showPicker = false
                    }
                ) {
                    Text("Aceptar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) {
                    Text("Cancelar")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

private fun fechaFormatter(): SimpleDateFormat =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

private fun hoyMillis(): Long {
    val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
}

private fun Long.toFechaText(): String = fechaFormatter().format(this)

private fun String.toFechaMillis(): Long? =
    takeIf { it.isNotBlank() }?.let {
        runCatching { fechaFormatter().parse(it)?.time }.getOrNull()
    }
