package com.petcare.app.features.adopciones.ui

import com.petcare.app.ui.components.elevacionTarjeta
import com.petcare.app.ui.components.elevacionBoton
import com.petcare.app.ui.components.elevacionBotonContorno
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.petcare.app.R
import com.petcare.app.features.adopciones.data.remote.PublicacionAdopcionResponse
import com.petcare.app.features.pets.ui.resolvePetPhotoUrl
import com.petcare.app.ui.theme.PetCareError
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareSurfaceSoft
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private const val UMBRAL_SWIPE_DP = 120

@Composable
fun AdopcionesListScreen(
    isLoading: Boolean,
    errorMessage: String?,
    publicaciones: List<PublicacionAdopcionResponse>,
    favoritoIds: Set<Int>,
    hayFiltrosActivos: Boolean,
    solicitudesPendientes: Int,
    onRetry: () -> Unit,
    onQuitarFiltros: () -> Unit,
    onVolverAEmpezar: () -> Unit,
    onPublicacionClick: (PublicacionAdopcionResponse) -> Unit,
    onPasar: (PublicacionAdopcionResponse) -> Unit,
    onMeInteresa: (PublicacionAdopcionResponse) -> Unit,
    onToggleFavorito: (PublicacionAdopcionResponse) -> Unit,
    onFiltrosClick: () -> Unit,
    onMisFavoritosClick: () -> Unit,
    onPublicarClick: () -> Unit,
    onMisPublicacionesClick: () -> Unit,
    onMisSolicitudesClick: () -> Unit
) {
    // Las mascotas "pasadas" se ocultan solo durante esta visita a la pantalla:
    // no se persisten en el backend, así que vuelven a ofrecerse más adelante.
    val pasadas = remember { mutableStateListOf<Int>() }
    val pendientes = publicaciones.filterNot { pasadas.contains(it.idPublicacion) }

    // Sin insets propios: la barra superior e inferior ya los resuelve la
    // pantalla que contiene a esta, y sumarlos de nuevo le quitaba lugar a la tarjeta.
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets(0, 0, 0, 0)
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(innerPadding)
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.Top,
            horizontalAlignment = Alignment.Start
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Mascotas en adopción",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Encontrá a tu próximo compañero",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                BotonFiltros(activo = hayFiltrosActivos, onClick = onFiltrosClick)
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Los accesos van en una fila que se desplaza; el degradado del borde
            // derecho deja claro que hay más opciones y no corta el texto en seco.
            Box(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AccesoAdopcion(
                        texto = "Publicar",
                        destacado = true,
                        iconRes = R.drawable.ic_add,
                        onClick = onPublicarClick
                    )
                    AccesoAdopcion(
                        texto = "Favoritos",
                        iconRes = R.drawable.ic_bookmark,
                        onClick = onMisFavoritosClick
                    )
                    AccesoAdopcion(
                        texto = "Mis publicaciones",
                        contador = solicitudesPendientes,
                        onClick = onMisPublicacionesClick
                    )
                    AccesoAdopcion(texto = "Mis solicitudes", onClick = onMisSolicitudesClick)
                    Spacer(modifier = Modifier.width(28.dp))
                }
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .width(28.dp)
                        .height(40.dp)
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    Color.Transparent,
                                    MaterialTheme.colorScheme.background
                                )
                            )
                        )
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            when {
                isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }

                errorMessage != null -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        elevation = elevacionTarjeta(),
                        colors = CardDefaults.cardColors(containerColor = PetCareSurfaceSoft),
                        border = BorderStroke(1.dp, PetCareLine),
                        shape = MaterialTheme.shapes.extraLarge
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = errorMessage,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            OutlinedButton(
                                elevation = elevacionBotonContorno(),
                                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface),
                                onClick = onRetry,
                                modifier = Modifier.fillMaxWidth(),
                                shape = MaterialTheme.shapes.large
                            ) {
                                Text("Reintentar")
                            }
                        }
                    }
                }

                pendientes.isEmpty() -> {
                    EstadoVacioDescubrimiento(
                        hayFiltrosActivos = hayFiltrosActivos,
                        onFiltrosClick = onFiltrosClick,
                        onQuitarFiltros = {
                            pasadas.clear()
                            onQuitarFiltros()
                        },
                        onVolverAEmpezar = {
                            pasadas.clear()
                            onVolverAEmpezar()
                        }
                    )
                }

                else -> {
                    val publicacion = pendientes.first()
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        TarjetaSwipeable(
                            key = publicacion.idPublicacion,
                            esFavorito = favoritoIds.contains(publicacion.idPublicacion),
                            publicacion = publicacion,
                            onTap = { onPublicacionClick(publicacion) },
                            onToggleFavorito = { onToggleFavorito(publicacion) },
                            onPasar = {
                                pasadas.add(publicacion.idPublicacion)
                                onPasar(publicacion)
                            },
                            onMeInteresa = { onMeInteresa(publicacion) }
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    BotonesAccion(
                        onPasar = {
                            pasadas.add(publicacion.idPublicacion)
                            onPasar(publicacion)
                        },
                        onGuardar = { onToggleFavorito(publicacion) },
                        onMeInteresa = { onMeInteresa(publicacion) }
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
private fun TarjetaSwipeable(
    key: Int,
    publicacion: PublicacionAdopcionResponse,
    esFavorito: Boolean,
    onTap: () -> Unit,
    onToggleFavorito: () -> Unit,
    onPasar: () -> Unit,
    onMeInteresa: () -> Unit
) {
    val density = androidx.compose.ui.platform.LocalDensity.current
    val umbralPx = with(density) { UMBRAL_SWIPE_DP.dp.toPx() }
    val offsetX = remember(key) { Animatable(0f) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInputSwipe(
                onDrag = { delta ->
                    scope.launch { offsetX.snapTo(offsetX.value + delta) }
                },
                onDragEnd = {
                    val valor = offsetX.value
                    when {
                        valor > umbralPx -> {
                            scope.launch {
                                offsetX.animateTo(2000f, tween(220))
                                onMeInteresa()
                            }
                        }
                        valor < -umbralPx -> {
                            scope.launch {
                                offsetX.animateTo(-2000f, tween(220))
                                onPasar()
                            }
                        }
                        else -> {
                            scope.launch { offsetX.animateTo(0f, tween(220)) }
                        }
                    }
                },
                onTap = onTap
            )
            .offset { androidx.compose.ui.unit.IntOffset(offsetX.value.roundToInt(), 0) }
            .rotate((offsetX.value / 40).coerceIn(-12f, 12f))
    ) {
        TarjetaMascota(publicacion = publicacion, esFavorito = esFavorito, onToggleFavorito = onToggleFavorito)

        // Overlay "ME INTERESA" (derecha)
        val alphaInteresa = (offsetX.value / umbralPx).coerceIn(0f, 1f)
        if (alphaInteresa > 0f) {
            Surface(
                modifier = Modifier
                    .padding(top = 28.dp, start = 24.dp)
                    .alpha(alphaInteresa),
                color = PetCareTeal,
                shape = MaterialTheme.shapes.medium
            ) {
                Text(
                    text = "ME INTERESA",
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }

        // Overlay "PASAR" (izquierda)
        val alphaPasar = (-offsetX.value / umbralPx).coerceIn(0f, 1f)
        if (alphaPasar > 0f) {
            Surface(
                modifier = Modifier
                    .padding(top = 28.dp, end = 24.dp)
                    .align(Alignment.TopEnd)
                    .alpha(alphaPasar),
                color = PetCareError,
                shape = MaterialTheme.shapes.medium
            ) {
                Text(
                    text = "PASAR",
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }
    }
}

private fun Modifier.pointerInputSwipe(
    onDrag: (Float) -> Unit,
    onDragEnd: () -> Unit,
    onTap: () -> Unit
): Modifier = this.then(
    Modifier.pointerInput(Unit) {
        detectTapGestures(onTap = { onTap() })
    }
).then(
    Modifier.pointerInput(Unit) {
        detectDragGestures(
            onDragEnd = onDragEnd,
            onDrag = { change, dragAmount ->
                change.consume()
                onDrag(dragAmount.x)
            }
        )
    }
)

@Composable
private fun TarjetaMascota(
    publicacion: PublicacionAdopcionResponse,
    esFavorito: Boolean,
    onToggleFavorito: () -> Unit
) {
    val mascota = publicacion.mascota
    Card(
        modifier = Modifier.fillMaxSize(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, PetCareLine),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        shape = RoundedCornerShape(28.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // La foto es lo que se mira primero: ocupa todo el espacio que deja
            // la información, con el nombre apoyado encima.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                val fotoUrl = remember(mascota.foto) { resolvePetPhotoUrl(mascota.foto) }
                if (fotoUrl != null) {
                    AsyncImage(
                        model = fotoUrl,
                        contentDescription = mascota.nombre,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(PetCareTealSoft),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.ic_paw),
                            contentDescription = null,
                            modifier = Modifier.size(72.dp),
                            tint = PetCareTeal
                        )
                    }
                }

                // Degradado para que el nombre se lea sobre cualquier foto.
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .height(110.dp)
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.Transparent,
                                    // Sin foto, el degradado es verde para no ensuciar el fondo.
                                    (if (fotoUrl != null) Color.Black else PetCareTealDark)
                                        .copy(alpha = 0.7f)
                                )
                            )
                        )
                )

                val ubicacion = listOfNotNull(
                    publicacion.ubicacion?.takeIf { it.isNotBlank() },
                    publicacion.provincia?.takeIf { it.isNotBlank() }
                ).joinToString(", ")
                if (ubicacion.isNotEmpty()) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(14.dp)
                            .widthIn(max = 220.dp),
                        color = Color.White.copy(alpha = 0.9f),
                        shape = CircleShape
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                painter = painterResource(R.drawable.ic_location),
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = PetCareTealDark
                            )
                            Text(
                                text = ubicacion,
                                color = PetCareTealDark,
                                style = MaterialTheme.typography.labelMedium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

                IconButton(
                    onClick = onToggleFavorito,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                ) {
                    Surface(color = Color.White.copy(alpha = 0.9f), shape = CircleShape) {
                        Icon(
                            painter = painterResource(
                                if (esFavorito) R.drawable.ic_bookmark else R.drawable.ic_bookmark_outline
                            ),
                            contentDescription = if (esFavorito) "Quitar de favoritos" else "Guardar en favoritos",
                            modifier = Modifier.padding(8.dp),
                            tint = PetCareTeal
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = mascota.nombre,
                            color = Color.White,
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        val resumen = listOfNotNull(
                            mascota.edadAnios?.let {
                                when (it) {
                                    0 -> "Menos de 1 año"
                                    1 -> "1 año"
                                    else -> "$it años"
                                }
                            },
                            sexoLabel(mascota.sexo)
                        ).joinToString(" · ")
                        if (resumen.isNotEmpty()) {
                            Text(
                                text = resumen,
                                color = Color.White.copy(alpha = 0.9f),
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                    Surface(color = PetCareTeal, shape = CircleShape) {
                        Text(
                            text = mascota.especie,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                            color = Color.White,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 18.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                val datos = listOfNotNull(
                    mascota.raza?.takeIf { it.isNotBlank() },
                    tamanoLabel(publicacion.tamano)
                )
                if (datos.isNotEmpty()) {
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        datos.forEach { dato -> EtiquetaDato(texto = dato) }
                    }
                }

                Text(
                    text = publicacion.descripcion,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                CaracteristicasFila(publicacion)
            }
        }
    }
}

/** Dato corto de la mascota (raza, tamaño) en una pastilla neutra. */
@Composable
private fun EtiquetaDato(texto: String) {
    Surface(color = PetCareSurfaceSoft, shape = CircleShape) {
        Text(
            text = texto,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.labelLarge
        )
    }
}

/**
 * Características en una sola fila de etiquetas, en vez de una lista vertical:
 * se leen de un vistazo y dejan más lugar a la foto.
 */
@Composable
private fun CaracteristicasFila(publicacion: PublicacionAdopcionResponse) {
    val caracteristicas = buildList {
        if (publicacion.mascota.esterilizado) add("Castrado/a")
        if (publicacion.vacunado) add("Vacunado/a")
        if (publicacion.compatiblePerros) add("Convive con perros")
        if (publicacion.compatibleGatos) add("Convive con gatos")
        if (publicacion.compatibleNinos) add("Convive con niños")
        if (publicacion.necesitaPatio) add("Necesita patio")
    }
    if (caracteristicas.isEmpty()) return

    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        caracteristicas.forEach { texto ->
            Surface(color = PetCareTealSoft, shape = CircleShape) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        painter = painterResource(R.drawable.ic_check),
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = PetCareTealDark
                    )
                    Text(
                        text = texto,
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.labelMedium,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
        }
    }
}

@Composable
private fun BotonesAccion(
    onPasar: () -> Unit,
    onGuardar: () -> Unit,
    onMeInteresa: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom
    ) {
        BotonCircular(
            iconRes = R.drawable.ic_close,
            etiqueta = "Pasar",
            containerColor = MaterialTheme.colorScheme.surface,
            iconTint = PetCareError,
            borderColor = PetCareLine,
            onClick = onPasar
        )
        BotonCircular(
            iconRes = R.drawable.ic_heart,
            etiqueta = "Me interesa",
            containerColor = PetCareTeal,
            iconTint = Color.White,
            borderColor = PetCareTeal,
            tamano = 68,
            onClick = onMeInteresa
        )
        BotonCircular(
            iconRes = R.drawable.ic_bookmark_outline,
            etiqueta = "Guardar",
            containerColor = MaterialTheme.colorScheme.surface,
            iconTint = PetCareTealDark,
            borderColor = PetCareLine,
            onClick = onGuardar
        )
    }
}

@Composable
private fun BotonCircular(
    iconRes: Int,
    etiqueta: String,
    containerColor: Color,
    iconTint: Color,
    borderColor: Color,
    onClick: () -> Unit,
    tamano: Int = 56
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(
            modifier = Modifier
                .size(tamano.dp)
                .clickable(onClick = onClick),
            shape = CircleShape,
            color = containerColor,
            border = BorderStroke(1.dp, borderColor),
            shadowElevation = 3.dp
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    painter = painterResource(iconRes),
                    contentDescription = etiqueta,
                    tint = iconTint,
                    modifier = Modifier.size((tamano * 0.43f).dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = etiqueta,
            color = PetCareMuted,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

/** Botón de filtros: se tiñe y muestra un punto cuando hay filtros activos. */
@Composable
private fun BotonFiltros(activo: Boolean, onClick: () -> Unit) {
    Box {
        Surface(
            modifier = Modifier
                .size(46.dp)
                .clickable(onClick = onClick),
            shape = CircleShape,
            color = if (activo) PetCareTealSoft else MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, if (activo) PetCareTeal else PetCareLine)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    painter = painterResource(R.drawable.ic_filter),
                    contentDescription = "Filtros",
                    tint = PetCareTealDark,
                    modifier = Modifier.size(22.dp)
                )
            }
        }
        if (activo) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(12.dp)
                    .background(PetCareTeal, CircleShape)
                    .border(2.dp, MaterialTheme.colorScheme.background, CircleShape)
            )
        }
    }
}

@Composable
private fun AccesoAdopcion(
    texto: String,
    onClick: () -> Unit,
    iconRes: Int? = null,
    destacado: Boolean = false,
    contador: Int = 0
) {
    // Un contador > 0 resalta el acceso igual que el botón principal: hay algo
    // esperando respuesta del usuario.
    val resaltado = destacado || contador > 0
    Surface(
        modifier = Modifier.clickable(onClick = onClick),
        shape = MaterialTheme.shapes.large,
        color = if (resaltado) PetCareTeal else MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        border = BorderStroke(1.dp, if (resaltado) PetCareTeal else PetCareLine)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (iconRes != null) {
                Icon(
                    painter = painterResource(iconRes),
                    contentDescription = null,
                    tint = if (resaltado) Color.White else PetCareTealDark,
                    modifier = Modifier.size(16.dp)
                )
            }
            Text(
                text = texto,
                color = if (resaltado) Color.White else PetCareTealDark,
                style = MaterialTheme.typography.labelLarge,
                maxLines = 1
            )
            if (contador > 0) {
                Surface(
                    modifier = Modifier.size(20.dp),
                    shape = CircleShape,
                    color = Color.White
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = contador.toString(),
                            color = PetCareTealDark,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EstadoVacioDescubrimiento(
    hayFiltrosActivos: Boolean,
    onFiltrosClick: () -> Unit,
    onQuitarFiltros: () -> Unit,
    onVolverAEmpezar: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            modifier = Modifier.size(96.dp),
            shape = CircleShape,
            color = PetCareTealSoft
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    painter = painterResource(R.drawable.ic_paw),
                    contentDescription = null,
                    modifier = Modifier.size(44.dp),
                    tint = PetCareTeal
                )
            }
        }
        Spacer(modifier = Modifier.height(18.dp))
        Text(
            text = "Ya viste todas las mascotas",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = if (hayFiltrosActivos) {
                "Ninguna coincide con tus filtros. Probá ampliando la búsqueda."
            } else {
                "Volvé más tarde: se publican mascotas nuevas todos los días."
            },
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            elevation = elevacionBoton(),
            onClick = if (hayFiltrosActivos) onQuitarFiltros else onVolverAEmpezar,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Text(if (hayFiltrosActivos) "Ver todas las mascotas" else "Volver a empezar")
        }
        Spacer(modifier = Modifier.height(8.dp))
        TextButton(onClick = onFiltrosClick) {
            Text("Modificar filtros", color = PetCareTealDark)
        }
    }
}

internal fun sexoLabel(sexo: String): String = when (sexo.lowercase()) {
    "macho" -> "Macho"
    "hembra" -> "Hembra"
    else -> sexo
}

internal fun tamanoLabel(tamano: String?): String? = when (tamano) {
    "PEQUENO" -> "Pequeño"
    "MEDIANO" -> "Mediano"
    "GRANDE" -> "Grande"
    else -> null
}
