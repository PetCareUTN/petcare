package com.petcare.app.features.ble.domain

/**
 * Una lectura de un tag de la flota PetCare (US-30).
 *
 * Es lo que emite el [MotorEscaneoBle]: solo lo que se puede saber mirando el aire.
 * A proposito **no** trae ubicacion ni deteccionId: esos los agrega la capa que arma
 * el payload de `POST /detecciones`, porque el motor lo comparte US-34 (deteccion de
 * separacion), a la que la ubicacion no le interesa.
 *
 * Ver docs/spike-escaneo-ble-segundo-plano.md, punto 5.
 */
data class TagDetectado(

    /**
     * Instance ID del frame Eddystone-UID: 12 caracteres hex en mayuscula.
     *
     * Es el `tagId` del contrato de deteccion y el mismo valor que el dueño asocia
     * a su mascota en US-32.
     */
    val tagId: String,

    /** Intensidad de señal recibida, en dBm. Siempre negativo en la practica. */
    val rssi: Int,

    /**
     * Momento de la lectura, en milisegundos desde epoch segun el reloj del telefono.
     *
     * El timestamp se toma en el dispositivo y no en el servidor porque las detecciones
     * se encolan cuando no hay red: la hora de llegada al backend no dice nada.
     */
    val detectadoEnMillis: Long,

    /** Ranging data del frame, calibrado a 0 metros. Ver [BeaconFrame.EddystoneUid]. */
    val txPower: Int,
) {

    /**
     * Estimacion grosera de distancia, en metros.
     *
     * Sirve para ordenar lecturas como "cerca / medio / lejos" y nada mas: el RSSI
     * rebota mucho con obstaculos y con la orientacion del tag.
     */
    val distanciaAproximadaMetros: Double
        get() = estimarDistanciaMetros(rssi, txPower - CAIDA_DE_0M_A_1M)
}
