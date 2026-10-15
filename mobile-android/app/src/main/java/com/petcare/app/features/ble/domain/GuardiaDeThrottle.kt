package com.petcare.app.features.ble.domain

/**
 * Evita que el duty cycling choque contra el limite de reinicios de escaneo de Android.
 *
 * Android bloquea a una app que llama `startScan()` **mas de 5 veces en 30 segundos**, y
 * lo hace **en silencio**: no llega `onScanFailed`, simplemente dejan de entregarse
 * resultados. Es la clase de falla que cuesta muchisimo diagnosticar en campo, asi que
 * conviene no llegar nunca al limite en vez de detectarlo despues.
 *
 * Es pura a proposito (recibe el reloj por parametro), asi que se testea sin dispositivo.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md, "Limite duro: Android throttlea los
 * reinicios de escaneo".
 */
class GuardiaDeThrottle(
    private val maximoInicios: Int = MAXIMO_INICIOS,
    private val ventanaMillis: Long = VENTANA_MILLIS,
) {

    private val iniciosRecientes = ArrayDeque<Long>()

    /**
     * Cuantos milisegundos hay que esperar antes de poder llamar a `startScan()` sin
     * arriesgarse al bloqueo. `0` si se puede arrancar ya.
     */
    fun esperaNecesariaMillis(ahoraMillis: Long): Long {
        descartarViejos(ahoraMillis)
        if (iniciosRecientes.size < maximoInicios) return 0

        // Hay que esperar a que el mas viejo de la ventana salga de ella.
        val masViejo = iniciosRecientes.first()
        return (masViejo + ventanaMillis) - ahoraMillis
    }

    /** Registra un `startScan()` efectivamente ejecutado. */
    fun registrarInicio(ahoraMillis: Long) {
        descartarViejos(ahoraMillis)
        iniciosRecientes.addLast(ahoraMillis)
    }

    /**
     * Olvida el historial.
     *
     * Para el que depure esto a mano: apagar y prender el Bluetooth limpia el bloqueo
     * del lado de Android. Esto solo limpia el nuestro.
     */
    fun reiniciar() = iniciosRecientes.clear()

    private fun descartarViejos(ahoraMillis: Long) {
        val corte = ahoraMillis - ventanaMillis
        while (iniciosRecientes.isNotEmpty() && iniciosRecientes.first() <= corte) {
            iniciosRecientes.removeFirst()
        }
    }

    companion object {
        /** El limite real de Android es 5; dejamos 4 para no rozarlo. */
        const val MAXIMO_INICIOS = 4

        const val VENTANA_MILLIS = 30_000L

        /**
         * Piso del intervalo de duty cycling, derivado del limite de arriba.
         *
         * Cada ventana de escaneo es un `startScan()` nuevo, asi que el intervalo no
         * puede bajar de aca. En produccion conviene mantenerlo en minutos, con margen
         * de sobra: ademas de evitar el bloqueo, es lo que cuida la bateria.
         */
        const val INTERVALO_MINIMO_MILLIS = 10_000L
    }
}
