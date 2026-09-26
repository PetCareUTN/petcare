package com.petcare.app.features.ble.domain

/**
 * Si un tag esta cerca (se lo sigue viendo) o separado (no se lo ve hace rato).
 */
enum class EstadoSeparacion {
    CERCA,
    SEPARADO,
}

/**
 * Detecta cuando un tag deja de verse durante un intervalo sostenido (US-34).
 *
 * Reusa las lecturas del mismo [MotorEscaneoBle] que US-30 (ver
 * docs/spike-escaneo-ble-segundo-plano.md): esta clase no escanea nada, solo interpreta
 * lecturas que ya llegaron. Quien integre esto con el foreground service real tiene que
 * llamar a [registrarLectura] por cada [TagDetectado] del motor, y a [evaluar]
 * periodicamente (por ejemplo, en cada ciclo de duty cycling).
 *
 * Es pura a proposito (recibe el reloj por parametro), asi que se testea sin dispositivo,
 * igual que [GuardiaDeThrottle].
 *
 * ## Por que no dispara con un corte momentaneo
 *
 * El estado de un tag es simplemente "hace cuanto fue la ultima lectura". Mientras el
 * hueco entre lecturas se mantenga por debajo de [intervaloSeparacionMillis], el tag
 * sigue [EstadoSeparacion.CERCA] sin importar cuantos huecos breves haya habido: una
 * interrupcion momentanea nunca acumula con la anterior. Solo pasa a
 * [EstadoSeparacion.SEPARADO] cuando el tiempo desde la ultima lectura, medido en el
 * momento de [evaluar], supera el intervalo.
 *
 * ## Aviso unico por episodio
 *
 * [evaluar] es una consulta pura: se puede llamar todas las veces que haga falta y
 * siempre contesta lo mismo si nada cambio. Pero la notificacion de US-35 no puede
 * colgarse de ahi directo, porque mientras el tag siga sin verse, cada consulta seguiria
 * diciendo [EstadoSeparacion.SEPARADO] y la notificacion se repetiria en cada ciclo.
 *
 * Para eso esta [separacionNuevaDetectada]: a diferencia de [evaluar], **tiene efecto
 * de lado** (marca el episodio como ya avisado) y contesta `true` una sola vez por
 * episodio de separacion. Vuelve a poder contestar `true` recien despues de que
 * [registrarLectura] confirme que el tag se volvio a ver (o sea, que empezo un episodio
 * nuevo).
 */
class DetectorDeSeparacion(
    private val intervaloSeparacionMillis: Long = INTERVALO_SEPARACION_POR_DEFECTO_MILLIS,
) {

    private class EstadoTag(
        var ultimaLecturaMillis: Long,
        var episodioYaAvisado: Boolean = false,
    )

    // Un tag sin entrada aca es un tag sin monitoreo activo: es lo que hace que
    // "monitoreo desactivado no genera detecciones" sea cierto por construccion, no un
    // caso especial a acordarse de chequear en cada metodo.
    private val tagsMonitoreados = mutableMapOf<String, EstadoTag>()

    /**
     * Activa el monitoreo de [tagId], asociado a la mascota que lo tiene puesto.
     *
     * Arranca la cuenta desde [ahoraMillis] a proposito: si se tomara como referencia
     * "nunca hubo lectura", un tag recien activado apareceria separado hasta que el
     * motor de escaneo entregue la primera lectura real, y esa demora no tiene nada que
     * ver con que la mascota se haya alejado.
     */
    fun activarMonitoreo(tagId: String, ahoraMillis: Long) {
        tagsMonitoreados[tagId] = EstadoTag(ultimaLecturaMillis = ahoraMillis)
    }

    /** Desactiva el monitoreo de [tagId]. Deja de poder evaluarse como separado. */
    fun desactivarMonitoreo(tagId: String) {
        tagsMonitoreados.remove(tagId)
    }

    fun monitoreoActivo(tagId: String): Boolean = tagsMonitoreados.containsKey(tagId)

    /**
     * Registra que se vio a [tagId] en [ahoraMillis].
     *
     * Si el tag no tiene el monitoreo activo la lectura se ignora: no hay estado que
     * actualizar, y activarlo despues arranca de cero con [activarMonitoreo] de todos
     * modos.
     *
     * Volver a verse cierra el episodio de separacion, si habia uno: la proxima vez que
     * el tag deje de verse, [separacionNuevaDetectada] va a poder avisar de nuevo.
     */
    fun registrarLectura(tagId: String, ahoraMillis: Long) {
        val estado = tagsMonitoreados[tagId] ?: return
        estado.ultimaLecturaMillis = ahoraMillis
        estado.episodioYaAvisado = false
    }

    /**
     * Estado de [tagId] al momento [ahoraMillis].
     *
     * Un tag sin monitoreo activo siempre da [EstadoSeparacion.CERCA]: no hay deteccion
     * que hacer sobre algo que el usuario no pidio vigilar.
     *
     * Es una consulta pura: no cambia nada y se puede llamar las veces que haga falta.
     * Para saber si corresponde mandar una notificacion, usar [separacionNuevaDetectada]
     * en cambio.
     */
    fun evaluar(tagId: String, ahoraMillis: Long): EstadoSeparacion {
        val estado = tagsMonitoreados[tagId] ?: return EstadoSeparacion.CERCA
        val transcurridoMillis = ahoraMillis - estado.ultimaLecturaMillis
        return if (transcurridoMillis >= intervaloSeparacionMillis) {
            EstadoSeparacion.SEPARADO
        } else {
            EstadoSeparacion.CERCA
        }
    }

    /**
     * `true` si [tagId] justo ahora cumplio el intervalo de separacion **y todavia no se
     * habia avisado** de este episodio.
     *
     * A diferencia de [evaluar], esta funcion tiene efecto de lado: la primera vez que
     * contesta `true` para un episodio, marca ese episodio como avisado, y no vuelve a
     * contestar `true` para el mismo episodio aunque se siga llamando. Solo puede volver
     * a avisar despues de que [registrarLectura] confirme una lectura nueva (el tag
     * volvio a verse) y despues se vuelva a separar.
     *
     * Pensada para que quien dispare la notificacion de US-35 la llame en cada ciclo de
     * duty cycling sin manejar su propio estado de "ya avise esto".
     */
    fun separacionNuevaDetectada(tagId: String, ahoraMillis: Long): Boolean {
        val estado = tagsMonitoreados[tagId] ?: return false
        if (estado.episodioYaAvisado) return false

        val separado = evaluar(tagId, ahoraMillis) == EstadoSeparacion.SEPARADO
        if (separado) estado.episodioYaAvisado = true
        return separado
    }

    companion object {
        /**
         * Punto de partida para el intervalo configurable del criterio de aceptacion,
         * a validar con el tag fisico (ver docs/spike-escaneo-ble-segundo-plano.md).
         *
         * Tiene que quedar comodamente por encima de
         * [MotorEscaneoBle.INTERVALO_ESCANEO_MILLIS] (60 s): si quedara cerca, perderse
         * una sola ventana de escaneo por mala suerte alcanzaria para marcar "separado"
         * sin que la mascota se haya alejado en absoluto.
         */
        const val INTERVALO_SEPARACION_POR_DEFECTO_MILLIS = 3 * 60 * 1000L
    }
}
