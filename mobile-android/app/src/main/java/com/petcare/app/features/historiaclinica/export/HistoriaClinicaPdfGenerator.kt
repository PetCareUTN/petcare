package com.petcare.app.features.historiaclinica.export

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import com.petcare.app.features.historiaclinica.data.remote.EventoClinicoResponse
import com.petcare.app.features.pets.data.remote.PetResponse
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Genera un PDF con la historia clinica completa de una mascota:
 * encabezado con el logo de PetCare, datos de la mascota y el listado
 * cronologico de eventos clinicos (incluyendo los archivos adjuntos de cada uno).
 *
 * Usa unicamente la API nativa [PdfDocument], sin librerias externas.
 */
object HistoriaClinicaPdfGenerator {

    // Dimensiones de una pagina A4 en puntos (72 dpi).
    private const val PAGE_WIDTH = 595
    private const val PAGE_HEIGHT = 842
    private const val MARGIN = 40f
    private const val CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

    private const val COLOR_TEAL = 0xFF00A896.toInt()
    private const val COLOR_INK = 0xFF17212B.toInt()
    private const val COLOR_MUTED = 0xFF65717C.toInt()
    private const val COLOR_LINE = 0xFFE6E1D4.toInt()

    private val eventTypeLabels = mapOf(
        "consulta" to "Consulta",
        "diagnostico" to "Diagnostico",
        "tratamiento" to "Tratamiento",
        "cirugia" to "Cirugia",
        "control" to "Control",
        "observacion" to "Observacion",
        "vacuna" to "Vacuna",
        "otro" to "Otro"
    )

    /**
     * Construye el PDF y lo escribe en un archivo temporal dentro de la
     * carpeta de exportaciones de la cache. Devuelve ese archivo.
     */
    fun generate(
        context: Context,
        pet: PetResponse,
        eventos: List<EventoClinicoResponse>
    ): File {
        val document = PdfDocument()
        val renderer = PageRenderer(context, document)

        renderer.startPage()
        renderer.drawHeader()
        renderer.drawPetInfo(pet)
        renderer.drawEventsTitle(eventos.size)

        if (eventos.isEmpty()) {
            renderer.drawEmptyEvents()
        } else {
            eventos.forEach { renderer.drawEvento(it) }
        }

        renderer.finishPage()

        val exportDir = File(context.cacheDir, "exportaciones").apply { mkdirs() }
        val safeName = pet.nombre.replace(Regex("[^A-Za-z0-9]"), "_").ifBlank { "mascota" }
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val file = File(exportDir, "historia_clinica_${safeName}_$timestamp.pdf")

        FileOutputStream(file).use { output ->
            document.writeTo(output)
        }
        document.close()

        return file
    }

    /**
     * Encapsula el dibujo con paginado. Mantiene el cursor vertical y crea
     * paginas nuevas automaticamente cuando el contenido no entra.
     */
    private class PageRenderer(
        private val context: Context,
        private val document: PdfDocument
    ) {
        private var page: PdfDocument.Page? = null
        private var canvas: Canvas = Canvas()
        private var y = MARGIN
        private var pageNumber = 0

        private val titlePaint = paint(COLOR_TEAL, 22f, bold = true)
        private val brandPaint = paint(COLOR_TEAL, 13f, bold = true)
        private val subtitlePaint = paint(COLOR_MUTED, 11f)
        private val sectionPaint = paint(COLOR_INK, 14f, bold = true)
        private val labelPaint = paint(COLOR_INK, 11f, bold = true)
        private val bodyPaint = paint(COLOR_INK, 11f)
        private val mutedPaint = paint(COLOR_MUTED, 10f)
        private val linePaint = Paint().apply {
            color = COLOR_LINE
            strokeWidth = 1f
        }

        fun startPage() {
            val pageInfo = PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber + 1).create()
            page = document.startPage(pageInfo)
            canvas = page!!.canvas
            pageNumber += 1
            y = MARGIN
        }

        fun finishPage() {
            page?.let {
                drawFooter()
                document.finishPage(it)
            }
            page = null
        }

        private fun newPage() {
            finishPage()
            startPage()
            drawRunningHeader()
        }

        /** Reserva [needed] puntos verticales; si no entran, salta de pagina. */
        private fun ensureSpace(needed: Float) {
            if (y + needed > PAGE_HEIGHT - MARGIN) {
                newPage()
            }
        }

        fun drawHeader() {
            val logo = loadLogo()
            val headerHeight = 60f
            if (logo != null) {
                // El logo ya contiene el nombre "PetCare", asi que no se
                // repite el texto de marca al costado.
                val ratio = logo.width.toFloat() / logo.height.toFloat()
                val destWidth = headerHeight * ratio
                val dest = RectF(MARGIN, y, MARGIN + destWidth, y + headerHeight)
                canvas.drawBitmap(logo, null, dest, null)
            } else {
                // Fallback: recuadro teal con "PC", igual al estilo de la app.
                val badge = RectF(MARGIN, y, MARGIN + headerHeight, y + headerHeight)
                val badgePaint = Paint().apply { color = COLOR_TEAL; isAntiAlias = true }
                canvas.drawRoundRect(badge, 12f, 12f, badgePaint)
                val pcPaint = paint(Color.WHITE, 20f, bold = true).apply {
                    textAlign = Paint.Align.CENTER
                }
                canvas.drawText("PC", badge.centerX(), badge.centerY() + 7f, pcPaint)
                val textX = MARGIN + headerHeight + 12f
                canvas.drawText("PetCare", textX, y + 24f, brandPaint)
                canvas.drawText("Cuidado conectado", textX, y + 42f, subtitlePaint)
            }

            val generado = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date())
            val genPaint = paint(COLOR_MUTED, 9f).apply { textAlign = Paint.Align.RIGHT }
            canvas.drawText("Generado: $generado", PAGE_WIDTH - MARGIN, y + 14f, genPaint)

            y += headerHeight + 10f
            canvas.drawText("Historia Clinica", MARGIN, y + 18f, titlePaint)
            y += 30f
            drawDivider()
            y += 14f
        }

        private fun drawRunningHeader() {
            val genPaint = paint(COLOR_MUTED, 9f).apply { textAlign = Paint.Align.RIGHT }
            canvas.drawText("PetCare - Historia Clinica", MARGIN, y + 10f, brandPaint)
            canvas.drawText("(continuacion)", PAGE_WIDTH - MARGIN, y + 10f, genPaint)
            y += 22f
            drawDivider()
            y += 14f
        }

        fun drawPetInfo(pet: PetResponse) {
            ensureSpace(40f)
            canvas.drawText("Mascota", MARGIN, y + 12f, sectionPaint)
            y += 24f

            val filas = buildList {
                add("Nombre" to pet.nombre)
                add("Especie" to pet.especie)
                pet.raza?.let { add("Raza" to it) }
                add("Sexo" to pet.sexo)
                pet.birthDate?.let { add("Fecha de nacimiento" to it) }
                pet.peso?.let { add("Peso" to "$it kg") }
                add("Esterilizado" to if (pet.esterilizado) "Si" else "No")
                pet.observaciones?.takeIf { it.isNotBlank() }?.let { add("Observaciones" to it) }
            }

            filas.forEach { (label, value) ->
                drawLabeledValue(label, value)
            }
            y += 8f
            drawDivider()
            y += 14f
        }

        fun drawEventsTitle(total: Int) {
            ensureSpace(30f)
            canvas.drawText("Eventos clinicos ($total)", MARGIN, y + 12f, sectionPaint)
            y += 26f
        }

        fun drawEmptyEvents() {
            ensureSpace(20f)
            canvas.drawText(
                "No hay eventos clinicos registrados para esta mascota.",
                MARGIN, y + 12f, mutedPaint
            )
            y += 20f
        }

        fun drawEvento(evento: EventoClinicoResponse) {
            // Cabecera del evento (tipo + fecha) mantenida junta con al menos una linea.
            ensureSpace(60f)
            val tipo = eventTypeLabels[evento.tipo] ?: evento.tipo
            canvas.drawText(tipo, MARGIN, y + 12f, labelPaint)
            val fechaPaint = paint(COLOR_MUTED, 10f).apply { textAlign = Paint.Align.RIGHT }
            canvas.drawText(evento.fecha, PAGE_WIDTH - MARGIN, y + 12f, fechaPaint)
            y += 22f

            drawWrapped(evento.descripcion, bodyPaint, MARGIN)
            evento.diagnostico?.takeIf { it.isNotBlank() }
                ?.let { drawLabeledValue("Diagnostico", it) }
            evento.tratamiento?.takeIf { it.isNotBlank() }
                ?.let { drawLabeledValue("Tratamiento", it) }
            evento.observaciones?.takeIf { it.isNotBlank() }
                ?.let { drawLabeledValue("Observaciones", it) }

            if (evento.archivos.isNotEmpty()) {
                ensureSpace(18f)
                canvas.drawText("Archivos adjuntos:", MARGIN, y + 11f, mutedPaint)
                y += 16f
                evento.archivos.forEach { archivo ->
                    ensureSpace(14f)
                    canvas.drawText("- ${archivo.nombreOriginal}", MARGIN + 10f, y + 11f, bodyPaint)
                    y += 14f
                }
            }

            y += 8f
            drawDivider()
            y += 12f
        }

        private fun drawLabeledValue(label: String, value: String) {
            val labelText = "$label: "
            val labelWidth = labelPaint.measureText(labelText)
            ensureSpace(16f)
            canvas.drawText(labelText, MARGIN, y + 11f, labelPaint)
            // El valor puede necesitar varias lineas; la primera arranca tras el label.
            drawWrapped(value, bodyPaint, MARGIN + labelWidth, firstLineOffset = MARGIN + labelWidth)
        }

        /**
         * Dibuja [text] ajustando por ancho. [x] es el margen izquierdo de las
         * lineas siguientes; [firstLineOffset], si se indica, ubica la primera.
         */
        private fun drawWrapped(
            text: String,
            paint: Paint,
            x: Float,
            firstLineOffset: Float = MARGIN
        ) {
            val words = text.split(" ")
            var line = StringBuilder()
            var first = true
            var currentX = firstLineOffset
            var maxWidth = PAGE_WIDTH - MARGIN - currentX

            fun flush() {
                ensureSpace(15f)
                canvas.drawText(line.toString(), currentX, y + 11f, paint)
                y += 15f
            }

            for (word in words) {
                val candidate = if (line.isEmpty()) word else "$line $word"
                if (paint.measureText(candidate) > maxWidth && line.isNotEmpty()) {
                    flush()
                    line = StringBuilder(word)
                    first = false
                    currentX = x
                    maxWidth = PAGE_WIDTH - MARGIN - currentX
                } else {
                    line = StringBuilder(candidate)
                }
            }
            if (line.isNotEmpty()) {
                flush()
            }
            if (first) {
                // Nunca deberia pasar, pero evita cursor sin avanzar.
                y += 0f
            }
        }

        private fun drawDivider() {
            canvas.drawLine(MARGIN, y, PAGE_WIDTH - MARGIN, y, linePaint)
        }

        private fun drawFooter() {
            val footerPaint = paint(COLOR_MUTED, 9f).apply { textAlign = Paint.Align.CENTER }
            canvas.drawText(
                "PetCare - Pagina $pageNumber",
                PAGE_WIDTH / 2f,
                PAGE_HEIGHT - MARGIN / 2f,
                footerPaint
            )
        }

        private fun loadLogo(): Bitmap? {
            val logoId = context.resources.getIdentifier(
                "logo_petcare", "drawable", context.packageName
            )
            if (logoId == 0) return null
            return try {
                ContextCompat.getDrawable(context, logoId)?.toBitmap()
            } catch (e: Exception) {
                null
            }
        }

        private fun paint(colorInt: Int, size: Float, bold: Boolean = false): Paint =
            Paint().apply {
                color = colorInt
                textSize = size
                isAntiAlias = true
                isFakeBoldText = bold
            }
    }
}
