package com.petcare.app.features.adopciones.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
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
                    Text(text = "Mascotas en adopción", style = MaterialTheme.typography.headlineSmall)
                    Text(
                        text = "Encontrá a tu próximo compañero",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                IconButton(onClick = onFiltrosClick) {
                    Icon(
                        painter = painterResource(R.drawable.ic_filter),
                        contentDescription = "Filtros",
                        tint = if (hayFiltrosActivos) PetCareTeal else PetCareTealDark
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

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
            }

            Spacer(modifier = Modifier.height(14.dp))

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
        shape = MaterialTheme.shapes.extraLarge
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
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
                            modifier = Modifier.size(64.dp),
                            tint = PetCareTeal
                        )
                    }
                }

                IconButton(
                    onClick = onToggleFavorito,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp)
                ) {
                    Surface(color = Color.White.copy(alpha = 0.85f), shape = CircleShape) {
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
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = mascota.nombre,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                    Surface(color = PetCareTealSoft, shape = MaterialTheme.shapes.large) {
                        Text(
                            text = mascota.especie,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            color = PetCareTealDark,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }

                Text(
                    text = listOfNotNull(
                        mascota.edadAnios?.let { if (it == 1) "1 año" else "$it años" },
                        sexoLabel(mascota.sexo)
                    ).joinToString(" · "),
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = listOfNotNull(mascota.raza, tamanoLabel(publicacion.tamano)).joinToString(" · "),
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
                publicacion.ubicacion?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        text = "📍 $it",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = publicacion.descripcion,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 3
                )

                Spacer(modifier = Modifier.height(4.dp))

                CaracteristicasFila(publicacion)
            }
        }
    }
}

@Composable
private fun CaracteristicasFila(publicacion: PublicacionAdopcionResponse) {
    val caracteristicas = buildList {
        if (publicacion.mascota.esterilizado) add("Castrado/a")
        if (publicacion.vacunado) add("Vacunado/a")
        if (publicacion.compatiblePerros) add("Convive con perros")
        if (publicacion.compatibleGatos) add("Convive con gatos")
        if (publicacion.compatibleNinos) add("Convive con niños")
        if (publicacion.necesitaPatio) add("🏠 Necesita patio")
    }
    if (caracteristicas.isEmpty()) return

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        caracteristicas.forEach { texto ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (!texto.startsWith("🏠")) {
                    Icon(
                        painter = painterResource(R.drawable.ic_check),
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = PetCareTeal
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text(text = texto, style = MaterialTheme.typography.bodySmall, color = PetCareMuted)
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
        horizontalArrangement = Arrangement.Center
    ) {
        BotonCircular(
            iconRes = R.drawable.ic_close,
            contentDescription = "Pasar",
            containerColor = MaterialTheme.colorScheme.surface,
            iconTint = PetCareError,
            borderColor = PetCareLine,
            onClick = onPasar
        )
        Spacer(modifier = Modifier.width(20.dp))
        BotonCircular(
            iconRes = R.drawable.ic_bookmark_outline,
            contentDescription = "Guardar",
            containerColor = MaterialTheme.colorScheme.surface,
            iconTint = PetCareTealDark,
            borderColor = PetCareLine,
            onClick = onGuardar
        )
        Spacer(modifier = Modifier.width(20.dp))
        BotonCircular(
            iconRes = R.drawable.ic_heart,
            contentDescription = "Me interesa",
            containerColor = PetCareTeal,
            iconTint = Color.White,
            borderColor = PetCareTeal,
            onClick = onMeInteresa
        )
    }
}

@Composable
private fun BotonCircular(
    iconRes: Int,
    contentDescription: String,
    containerColor: Color,
    iconTint: Color,
    borderColor: Color,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .size(60.dp)
            .clickable(onClick = onClick),
        shape = CircleShape,
        color = containerColor,
        border = BorderStroke(1.dp, borderColor)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                painter = painterResource(iconRes),
                contentDescription = contentDescription,
                tint = iconTint,
                modifier = Modifier.size(26.dp)
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
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = "🐾", style = MaterialTheme.typography.displayMedium)
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "No hay más mascotas por ahora",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "Probá modificando tus filtros.",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(onClick = onFiltrosClick, shape = MaterialTheme.shapes.large) {
                Text("Modificar filtros")
            }
            if (hayFiltrosActivos) {
                OutlinedButton(onClick = onQuitarFiltros, shape = MaterialTheme.shapes.large) {
                    Text("Ver todas")
                }
            } else {
                OutlinedButton(onClick = onVolverAEmpezar, shape = MaterialTheme.shapes.large) {
                    Text("Volver a empezar")
                }
            }
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
