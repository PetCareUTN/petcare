package com.petcare.app.features.ble.domain

/**
 * Decodificadores de los formatos que puede emitir el Blue Charm BC021 (US-30).
 *
 * Son funciones puras sobre ByteArray a proposito: no dependen del SDK de Android,
 * asi que se pueden testear sin dispositivo.
 *
 * Vienen del banco de pruebas del spike (src/debug), que ya confirmo Eddystone-UID
 * contra el tag real. Es la unica pieza del spike que sobrevivio tal cual, asi que
 * paso a src/main sin cambios funcionales.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md
 */

/** UUID de servicio de Eddystone. Es el que se usa en el ScanFilter. */
const val EDDYSTONE_SERVICE_UUID = "0000FEAA-0000-1000-8000-00805F9B34FB"

/** Company ID de Apple, bajo el que viaja iBeacon en manufacturer specific data. */
const val APPLE_COMPANY_ID = 0x004C

/**
 * Perdida de trayecto en espacio libre entre 0 y 1 metro a 2,4 GHz, redondeada.
 *
 * Es la constante que separa la referencia de Eddystone (calibrada a 0 m) de la de
 * iBeacon y las formulas de estimacion de distancia (calibradas a 1 m).
 */
const val CAIDA_DE_0M_A_1M = 41

sealed interface BeaconFrame {

    /**
     * Eddystone-UID: el formato que proponemos usar.
     *
     * El namespace (10 bytes) identifica a la flota PetCare y va en la mascara del
     * ScanFilter; el instance (6 bytes) identifica al tag concreto y es el `tagId`
     * del contrato de deteccion.
     */
    data class EddystoneUid(
        val namespace: String,
        val instance: String,
        /** Ranging data del frame: potencia calibrada **a 0 metros**. */
        val txPower: Int,
    ) : BeaconFrame {

        /**
         * Equivalente a 1 metro, que es la referencia que usa la formula de distancia.
         *
         * Eddystone calibra su ranging data a 0 m, mientras que iBeacon —y las formulas
         * de estimacion que circulan— usan 1 m. Entre una y otra hay ~41 dB de perdida
         * de trayecto en 2,4 GHz. Sin esta correccion la distancia sale disparatada:
         * un tag sobre la mesa daba 1052 m.
         */
        val txPowerA1Metro: Int get() = txPower - CAIDA_DE_0M_A_1M
    }

    /**
     * Eddystone-TLM: telemetria del propio tag. No hace falta para US-30, pero da
     * el nivel de bateria gratis (candidato a "avisale al dueño que cambie la pila").
     */
    data class EddystoneTlm(
        val bateriaMilliVolts: Int,
        val temperaturaCelsius: Double,
        val conteoAdvertisements: Long,
        val encendidoHaceSegundos: Long,
    ) : BeaconFrame

    /** Eddystone-URL. No lo usamos, pero conviene reconocerlo para no reportarlo como desconocido. */
    data class EddystoneUrl(val txPower: Int) : BeaconFrame

    /**
     * iBeacon: el formato alternativo del BC021, que descartamos.
     *
     * Se decodifica igual para poder comprobar en el banco de pruebas con que formato
     * viene configurado el tag de fabrica.
     */
    data class IBeacon(
        val proximityUuid: String,
        val major: Int,
        val minor: Int,
        val measuredPower: Int,
    ) : BeaconFrame

    /**
     * Cualquier frame que no sepamos leer, con los bytes crudos a la vista.
     *
     * Es util de verdad: el BC021 emite tambien formatos propietarios de KBeacon
     * (KSensor, acelerometro) bajo el mismo service UUID 0xFEAA, con tipos fuera de
     * la especificacion Eddystone. Verlos en hexa permite identificarlos.
     */
    data class Desconocido(
        val tipo: Int,
        val descripcion: String,
        val hexCrudo: String,
    ) : BeaconFrame
}

/** Etiqueta estable por tipo de frame, para acumular sin pisar. */
fun BeaconFrame.clave(): String = when (this) {
    is BeaconFrame.EddystoneUid -> "UID"
    is BeaconFrame.EddystoneTlm -> "TLM"
    is BeaconFrame.EddystoneUrl -> "URL"
    is BeaconFrame.IBeacon -> "IBEACON"
    is BeaconFrame.Desconocido -> "DESC-%02X".format(tipo)
}

/** Decodifica el service data publicado bajo el UUID 0xFEAA. */
fun decodificarEddystone(serviceData: ByteArray): BeaconFrame = when {
    serviceData.isEmpty() -> BeaconFrame.Desconocido(
        tipo = -1,
        descripcion = "service data vacio",
        hexCrudo = "",
    )

    // Frame UID: [0]=0x00 [1]=txPower [2..11]=namespace [12..17]=instance [18..19]=RFU
    serviceData[0] == 0x00.toByte() && serviceData.size >= 18 -> BeaconFrame.EddystoneUid(
        namespace = serviceData.aHex(2, 12),
        instance = serviceData.aHex(12, 18),
        txPower = serviceData[1].toInt(),
    )

    // Frame TLM: [0]=0x20 [1]=version [2..3]=bateria mV [4..5]=temp 8.8 [6..9]=adv count [10..13]=uptime
    serviceData[0] == 0x20.toByte() && serviceData.size >= 14 -> BeaconFrame.EddystoneTlm(
        bateriaMilliVolts = serviceData.uint16(2),
        // Temperatura en punto fijo 8.8 con signo: el byte alto es la parte entera.
        temperaturaCelsius = serviceData[4].toInt() + (serviceData[5].toInt() and 0xFF) / 256.0,
        conteoAdvertisements = serviceData.uint32(6),
        // El contador viene en decimas de segundo.
        encendidoHaceSegundos = serviceData.uint32(10) / 10,
    )

    serviceData[0] == 0x10.toByte() && serviceData.size >= 2 ->
        BeaconFrame.EddystoneUrl(txPower = serviceData[1].toInt())

    else -> {
        val tipo = serviceData[0].toInt() and 0xFF
        BeaconFrame.Desconocido(
            tipo = tipo,
            descripcion = when (tipo) {
                // Los 0x2X fuera del 0x20 (TLM) son formatos propietarios de KBeacon
                // que viajan bajo el mismo service UUID que Eddystone.
                in 0x21..0x2F -> "frame propietario KBeacon 0x%02X (KSensor)".format(tipo)
                else -> "frame Eddystone 0x%02X desconocido".format(tipo)
            },
            hexCrudo = serviceData.aHex(0, serviceData.size),
        )
    }
}

/**
 * Decodifica manufacturer data de Apple como iBeacon.
 *
 * `data` NO incluye el company ID: Android ya lo consumio como clave del SparseArray.
 * Layout: [0]=0x02 [1]=0x15 [2..17]=UUID [18..19]=major [20..21]=minor [22]=measured power
 *
 * El prefijo 0x02 0x15 es lo que distingue un iBeacon del resto del trafico que los
 * iPhone emiten bajo el mismo company ID (Continuity, Handoff, AirDrop...), que es
 * justamente el motivo por el que descartamos filtrar por este campo.
 */
fun decodificarIBeacon(data: ByteArray): BeaconFrame? {
    if (data.size < 23) return null
    if (data[0] != 0x02.toByte() || data[1] != 0x15.toByte()) return null

    val uuid = data.aHex(2, 18).let {
        "${it.substring(0, 8)}-${it.substring(8, 12)}-${it.substring(12, 16)}-" +
            "${it.substring(16, 20)}-${it.substring(20, 32)}"
    }
    return BeaconFrame.IBeacon(
        proximityUuid = uuid,
        major = data.uint16(18),
        minor = data.uint16(20),
        measuredPower = data[22].toInt(),
    )
}

/**
 * Estima distancia a partir del RSSI y la potencia medida a 1 metro.
 *
 * Es deliberadamente grosera: sirve para el banco de pruebas del spike, no para
 * la app. El RSSI rebota mucho con obstaculos y orientacion del tag, asi que el
 * numero hay que leerlo como "cerca / medio / lejos" y nada mas.
 */
fun estimarDistanciaMetros(rssi: Int, txPowerA1Metro: Int): Double {
    if (rssi == 0) return -1.0
    val ratio = rssi.toDouble() / txPowerA1Metro.toDouble()
    return if (ratio < 1.0) {
        Math.pow(ratio, 10.0)
    } else {
        0.89976 * Math.pow(ratio, 7.7095) + 0.111
    }
}

private fun ByteArray.aHex(desde: Int, hasta: Int): String =
    slice(desde until hasta).joinToString("") { "%02X".format(it) }

private fun ByteArray.uint16(offset: Int): Int =
    ((this[offset].toInt() and 0xFF) shl 8) or (this[offset + 1].toInt() and 0xFF)

private fun ByteArray.uint32(offset: Int): Long =
    ((this[offset].toLong() and 0xFF) shl 24) or
        ((this[offset + 1].toLong() and 0xFF) shl 16) or
        ((this[offset + 2].toLong() and 0xFF) shl 8) or
        (this[offset + 3].toLong() and 0xFF)
