package com.petcare.app.features.pets.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.core.graphics.scale
import androidx.compose.foundation.Image
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
import java.io.File
import kotlin.math.max
import kotlin.math.roundToInt
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val MAX_EDITOR_BITMAP_DIMENSION = 4096
private const val MAX_OUTPUT_DIMENSION = 1024
private const val MIN_ZOOM = 1f
private const val MAX_ZOOM = 4f

internal data class SquareCrop(
    val left: Int,
    val top: Int,
    val size: Int
)

internal fun normalizeWeightInput(value: String): String {
    val normalized = value.replace(',', '.')
    val result = StringBuilder()
    var hasDecimalSeparator = false

    normalized.forEach { character ->
        when {
            character.isDigit() -> result.append(character)
            character == '.' && !hasDecimalSeparator -> {
                result.append(character)
                hasDecimalSeparator = true
            }
        }
    }

    return result.toString().take(7)
}

internal fun calculateSquareCrop(
    sourceWidth: Int,
    sourceHeight: Int,
    viewportSize: Int,
    zoom: Float,
    offset: Offset
): SquareCrop {
    require(sourceWidth > 0 && sourceHeight > 0 && viewportSize > 0)

    val baseScale = max(
        viewportSize.toFloat() / sourceWidth,
        viewportSize.toFloat() / sourceHeight
    )
    val totalScale = baseScale * zoom.coerceIn(MIN_ZOOM, MAX_ZOOM)
    val cropSize = (viewportSize / totalScale)
        .roundToInt()
        .coerceIn(1, minOf(sourceWidth, sourceHeight))
    val sourceCenterX = sourceWidth / 2f - offset.x / totalScale
    val sourceCenterY = sourceHeight / 2f - offset.y / totalScale
    val left = (sourceCenterX - cropSize / 2f)
        .roundToInt()
        .coerceIn(0, sourceWidth - cropSize)
    val top = (sourceCenterY - cropSize / 2f)
        .roundToInt()
        .coerceIn(0, sourceHeight - cropSize)

    return SquareCrop(left = left, top = top, size = cropSize)
}

private fun constrainPhotoOffset(
    bitmap: Bitmap,
    viewportSize: Int,
    zoom: Float,
    offset: Offset
): Offset {
    if (viewportSize <= 0) return Offset.Zero

    val baseScale = max(
        viewportSize.toFloat() / bitmap.width,
        viewportSize.toFloat() / bitmap.height
    )
    val scaledWidth = bitmap.width * baseScale * zoom
    val scaledHeight = bitmap.height * baseScale * zoom
    val maxOffsetX = ((scaledWidth - viewportSize) / 2f).coerceAtLeast(0f)
    val maxOffsetY = ((scaledHeight - viewportSize) / 2f).coerceAtLeast(0f)

    return Offset(
        x = offset.x.coerceIn(-maxOffsetX, maxOffsetX),
        y = offset.y.coerceIn(-maxOffsetY, maxOffsetY)
    )
}

@Composable
internal fun PetPhotoField(
    photoUri: Uri?,
    enabled: Boolean,
    onPhotoAdjusted: (Uri) -> Unit
) {
    var uriBeingEdited by remember { mutableStateOf<Uri?>(null) }
    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) uriBeingEdited = uri
    }
    val previewBitmap by rememberDecodedBitmap(photoUri, maxDimension = MAX_OUTPUT_DIMENSION)

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = PetCareMint,
        shape = MaterialTheme.shapes.extraLarge,
        border = BorderStroke(1.dp, PetCareLine)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (previewBitmap != null) {
                Image(
                    bitmap = previewBitmap!!.asImageBitmap(),
                    contentDescription = "Vista previa de la foto de la mascota",
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(190.dp)
                        .clip(MaterialTheme.shapes.large),
                    contentScale = ContentScale.Crop
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = if (photoUri == null) "Foto opcional" else "Foto lista",
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = if (photoUri == null) {
                        "Elegí una imagen y ajustá el encuadre antes de subirla."
                    } else {
                        "La imagen se recortará con este encuadre."
                    },
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = "JPG, PNG o WEBP. Se optimiza para no superar 2 MB.",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (photoUri != null) {
                    OutlinedButton(
                        onClick = { uriBeingEdited = photoUri },
                        modifier = Modifier.weight(1f),
                        enabled = enabled
                    ) {
                        Text("Reajustar")
                    }
                }
                Button(
                    onClick = { photoPicker.launch("image/*") },
                    modifier = Modifier.weight(1f),
                    enabled = enabled
                ) {
                    Text(if (photoUri == null) "Elegir foto" else "Cambiar")
                }
            }
        }
    }

    uriBeingEdited?.let { sourceUri ->
        PhotoAdjustmentDialog(
            sourceUri = sourceUri,
            onDismiss = { uriBeingEdited = null },
            onConfirm = { adjustedUri ->
                onPhotoAdjusted(adjustedUri)
                uriBeingEdited = null
            }
        )
    }
}

@Composable
private fun PhotoAdjustmentDialog(
    sourceUri: Uri,
    onDismiss: () -> Unit,
    onConfirm: (Uri) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val bitmap by rememberDecodedBitmap(sourceUri, MAX_EDITOR_BITMAP_DIMENSION)
    var zoom by remember(sourceUri) { mutableFloatStateOf(MIN_ZOOM) }
    var offset by remember(sourceUri) { mutableStateOf(Offset.Zero) }
    var viewportSize by remember(sourceUri) { mutableIntStateOf(0) }
    var isSaving by remember(sourceUri) { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = { if (!isSaving) onDismiss() },
        title = { Text("Ajustar foto") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    text = "Arrastrá para mover y pellizcá o usá el control para ampliar.",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color(0xFF172321)),
                    contentAlignment = Alignment.Center
                ) {
                    if (bitmap == null) {
                        CircularProgressIndicator()
                    } else {
                        val imageBitmap = remember(bitmap) { bitmap!!.asImageBitmap() }
                        Canvas(
                            modifier = Modifier
                                .fillMaxSize()
                                .onSizeChanged { viewportSize = minOf(it.width, it.height) }
                                .pointerInput(bitmap, viewportSize) {
                                    detectTransformGestures { _, pan, gestureZoom, _ ->
                                        val nextZoom = (zoom * gestureZoom)
                                            .coerceIn(MIN_ZOOM, MAX_ZOOM)
                                        offset = constrainPhotoOffset(
                                            bitmap = bitmap!!,
                                            viewportSize = viewportSize,
                                            zoom = nextZoom,
                                            offset = offset + pan
                                        )
                                        zoom = nextZoom
                                    }
                                }
                        ) {
                            val baseScale = max(
                                size.width / imageBitmap.width,
                                size.height / imageBitmap.height
                            )
                            val destinationWidth = imageBitmap.width * baseScale * zoom
                            val destinationHeight = imageBitmap.height * baseScale * zoom
                            drawImage(
                                image = imageBitmap,
                                dstOffset = IntOffset(
                                    x = ((size.width - destinationWidth) / 2f + offset.x)
                                        .roundToInt(),
                                    y = ((size.height - destinationHeight) / 2f + offset.y)
                                        .roundToInt()
                                ),
                                dstSize = IntSize(
                                    width = destinationWidth.roundToInt(),
                                    height = destinationHeight.roundToInt()
                                ),
                                filterQuality = FilterQuality.High
                            )
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text("Zoom", style = MaterialTheme.typography.labelLarge)
                    Slider(
                        value = zoom,
                        onValueChange = { nextZoom ->
                            zoom = nextZoom
                            bitmap?.let {
                                offset = constrainPhotoOffset(
                                    bitmap = it,
                                    viewportSize = viewportSize,
                                    zoom = nextZoom,
                                    offset = offset
                                )
                            }
                        },
                        valueRange = MIN_ZOOM..MAX_ZOOM,
                        modifier = Modifier.weight(1f),
                        enabled = bitmap != null && !isSaving
                    )
                    TextButton(
                        onClick = {
                            zoom = MIN_ZOOM
                            offset = Offset.Zero
                        },
                        enabled = bitmap != null && !isSaving
                    ) {
                        Text("Restablecer")
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val sourceBitmap = bitmap ?: return@Button
                    if (viewportSize <= 0) return@Button
                    isSaving = true
                    scope.launch {
                        val adjustedUri = withContext(Dispatchers.IO) {
                            saveAdjustedPhoto(
                                context = context,
                                bitmap = sourceBitmap,
                                crop = calculateSquareCrop(
                                    sourceWidth = sourceBitmap.width,
                                    sourceHeight = sourceBitmap.height,
                                    viewportSize = viewportSize,
                                    zoom = zoom,
                                    offset = offset
                                )
                            )
                        }
                        isSaving = false
                        onConfirm(adjustedUri)
                    }
                },
                enabled = bitmap != null && viewportSize > 0 && !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(18.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Usar encuadre")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSaving) {
                Text("Cancelar")
            }
        }
    )
}

@Composable
private fun rememberDecodedBitmap(
    uri: Uri?,
    maxDimension: Int
) : State<Bitmap?> {
    val context = LocalContext.current.applicationContext
    return produceState<Bitmap?>(initialValue = null, uri, maxDimension, context) {
        value = if (uri == null) {
            null
        } else {
            withContext(Dispatchers.IO) {
                runCatching { decodeSampledBitmap(context, uri, maxDimension) }
                    .getOrNull()
            }
        }
    }
}

private fun decodeSampledBitmap(context: Context, uri: Uri, maxDimension: Int): Bitmap? {
    val resolver = context.contentResolver
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        val source = ImageDecoder.createSource(resolver, uri)
        return ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
            val largestDimension = max(info.size.width, info.size.height)
            if (largestDimension > maxDimension) {
                val scale = maxDimension.toFloat() / largestDimension
                decoder.setTargetSize(
                    (info.size.width * scale).roundToInt(),
                    (info.size.height * scale).roundToInt()
                )
            }
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
        }
    }

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

    var sampleSize = 1
    while (max(bounds.outWidth, bounds.outHeight) / sampleSize > maxDimension) {
        sampleSize *= 2
    }

    val options = BitmapFactory.Options().apply {
        inSampleSize = sampleSize
        inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    return resolver.openInputStream(uri)?.use {
        BitmapFactory.decodeStream(it, null, options)
    }
}

private fun saveAdjustedPhoto(
    context: Context,
    bitmap: Bitmap,
    crop: SquareCrop
): Uri {
    val cropped = Bitmap.createBitmap(bitmap, crop.left, crop.top, crop.size, crop.size)
    val outputSize = minOf(MAX_OUTPUT_DIMENSION, crop.size)
    val outputBitmap = if (cropped.width == outputSize) {
        cropped
    } else {
        cropped.scale(outputSize, outputSize)
    }
    val photoDirectory = File(context.cacheDir, "pet-photos").apply { mkdirs() }
    val outputFile = File(photoDirectory, "pet-${System.currentTimeMillis()}.jpg")
    outputFile.outputStream().buffered().use { stream ->
        check(outputBitmap.compress(Bitmap.CompressFormat.JPEG, 88, stream)) {
            "No se pudo guardar la foto ajustada"
        }
    }
    if (outputBitmap !== cropped) outputBitmap.recycle()
    if (cropped !== bitmap) cropped.recycle()
    return Uri.fromFile(outputFile)
}
