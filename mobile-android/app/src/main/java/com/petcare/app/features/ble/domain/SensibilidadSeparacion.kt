package com.petcare.app.features.ble.domain

/**
 * Cuan rapido avisa la app que una mascota se alejo: el umbral configurable de US-35.
 *
 * Son pocos niveles fijos y no un campo libre de minutos a proposito: por debajo de
 * dos ventanas de escaneo ([MotorEscaneoBle.INTERVALO_ESCANEO_MILLIS]) perderse una
 * sola lectura por mala suerte ya alcanzaria para avisar sin que la mascota se haya
 * movido, y un dueño no tiene forma de saber eso al elegir un numero.
 */
enum class SensibilidadSeparacion(
    val intervaloMillis: Long,
    val etiqueta: String,
    val descripcion: String,
) {
    ALTA(2 * 60 * 1000L, "Alta", "Avisa a los 2 minutos sin detectarla"),
    MEDIA(
        DetectorDeSeparacion.INTERVALO_SEPARACION_POR_DEFECTO_MILLIS,
        "Media",
        "Avisa a los 3 minutos sin detectarla",
    ),
    BAJA(5 * 60 * 1000L, "Baja", "Avisa a los 5 minutos sin detectarla");

    /**
     * Umbral efectivo segun cada cuanto se escanea.
     *
     * El intervalo de escaneo lo puede subir el usuario desde la colaboracion (US-30),
     * y el mismo escaneo alimenta a la separacion: si escanea cada 3 minutos, un umbral
     * de 2 avisaria entre dos ventanas aunque la mascota este al lado. Por eso nunca
     * baja de dos intervalos de escaneo.
     */
    fun intervaloEfectivoMillis(intervaloEscaneoMillis: Long): Long =
        maxOf(intervaloMillis, 2 * intervaloEscaneoMillis)

    companion object {
        val POR_DEFECTO = MEDIA

        fun desdeNombre(nombre: String?): SensibilidadSeparacion =
            entries.firstOrNull { it.name == nombre } ?: POR_DEFECTO
    }
}
