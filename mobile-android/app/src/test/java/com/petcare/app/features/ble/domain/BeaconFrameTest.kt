package com.petcare.app.features.ble.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Tests del decodificador del spike US-30.
 *
 * Corren sin dispositivo (`gradlew testDebugUnitTest`) y sirven para separar aguas
 * cuando el banco de pruebas no muestre nada: si estos pasan, el problema esta en el
 * escaneo, los permisos o la configuracion del tag, no en la decodificacion.
 *
 * Las tramas son sinteticas, armadas segun la especificacion de cada formato.
 */
class BeaconFrameTest {

    @Test
    fun `decodifica un frame Eddystone-UID y extrae namespace e instance`() {
        // [0]=tipo 0x00  [1]=txPower  [2..11]=namespace  [12..17]=instance  [18..19]=RFU
        val frame = hex("00" + "EB" + "0102030405060708090A" + "4F2A91C0DE01" + "0000")

        val resultado = decodificarEddystone(frame)

        val uid = resultado as BeaconFrame.EddystoneUid
        assertEquals("0102030405060708090A", uid.namespace)
        assertEquals("4F2A91C0DE01", uid.instance)
        // 0xEB como byte con signo es -21 dBm.
        assertEquals(-21, uid.txPower)
    }

    @Test
    fun `decodifica un frame Eddystone-TLM con bateria y temperatura`() {
        // [0]=0x20 [1]=version [2..3]=mV [4..5]=temp 8.8 [6..9]=adv count [10..13]=decimas de segundo
        val frame = hex("20" + "00" + "0B54" + "1980" + "000003E8" + "00002710")

        val resultado = decodificarEddystone(frame)

        val tlm = resultado as BeaconFrame.EddystoneTlm
        assertEquals(2900, tlm.bateriaMilliVolts)
        assertEquals(25.5, tlm.temperaturaCelsius, 0.01)
        assertEquals(1000L, tlm.conteoAdvertisements)
        // 10000 decimas = 1000 segundos.
        assertEquals(1000L, tlm.encendidoHaceSegundos)
    }

    @Test
    fun `reconoce un frame Eddystone-URL sin romperse`() {
        val resultado = decodificarEddystone(hex("10" + "EB" + "00"))

        assertTrue(resultado is BeaconFrame.EddystoneUrl)
    }

    @Test
    fun `un frame Eddystone truncado no explota y se reporta como desconocido`() {
        // Tipo UID pero sin los bytes de namespace e instance.
        val resultado = decodificarEddystone(hex("00" + "EB" + "0102"))

        assertTrue(resultado is BeaconFrame.Desconocido)
    }

    @Test
    fun `service data vacio se reporta como desconocido`() {
        assertTrue(decodificarEddystone(ByteArray(0)) is BeaconFrame.Desconocido)
    }

    @Test
    fun `decodifica un iBeacon con UUID major y minor`() {
        // [0]=0x02 [1]=0x15 [2..17]=UUID [18..19]=major [20..21]=minor [22]=measured power
        val datos = hex("0215" + "426C7565436861726D0000000000BEEF" + "0001" + "0002" + "C5")

        val resultado = decodificarIBeacon(datos)

        val ibeacon = resultado as BeaconFrame.IBeacon
        assertEquals("426C7565-4368-6172-6D00-00000000BEEF", ibeacon.proximityUuid)
        assertEquals(1, ibeacon.major)
        assertEquals(2, ibeacon.minor)
        assertEquals(-59, ibeacon.measuredPower)
    }

    @Test
    fun `descarta manufacturer data de Apple que no es iBeacon`() {
        // Trafico tipico de Continuity de un iPhone: mismo company ID, otro prefijo.
        // Es justamente el ruido por el que descartamos filtrar por manufacturer data.
        val continuity = hex("10" + "05" + "0A1B2C3D4E")

        assertNull(decodificarIBeacon(continuity))
    }

    @Test
    fun `descarta manufacturer data demasiado corto para ser iBeacon`() {
        assertNull(decodificarIBeacon(hex("0215" + "00")))
    }

    @Test
    fun `el txPower de Eddystone se convierte de 0 metros a 1 metro`() {
        // 0xEE = -18 dBm, el ranging data tipico de un tag transmitiendo a 0 dBm.
        val frame = hex("00" + "EE" + "0102030405060708090A" + "4F2A91C0DE01" + "0000")

        val uid = decodificarEddystone(frame) as BeaconFrame.EddystoneUid

        assertEquals(-18, uid.txPower)
        assertEquals(-59, uid.txPowerA1Metro)
    }

    @Test
    fun `un tag pegado al telefono no da cientos de metros`() {
        // Regresion del bug que mostraba 1052 m con el tag sobre la mesa, por usar el
        // ranging data de Eddystone (calibrado a 0 m) contra una formula que espera 1 m.
        val frame = hex("00" + "EE" + "0102030405060708090A" + "4F2A91C0DE01" + "0000")
        val uid = decodificarEddystone(frame) as BeaconFrame.EddystoneUid

        val distancia = estimarDistanciaMetros(rssi = -45, txPowerA1Metro = uid.txPowerA1Metro)

        assertTrue("dio $distancia m, deberia ser de pocos metros", distancia < 5.0)
    }

    @Test
    fun `la distancia estimada crece cuando el RSSI se debilita`() {
        val cerca = estimarDistanciaMetros(rssi = -40, txPowerA1Metro = -59)
        val lejos = estimarDistanciaMetros(rssi = -90, txPowerA1Metro = -59)

        assertTrue("una señal mas debil tiene que dar mas distancia", lejos > cerca)
    }

    private fun hex(s: String): ByteArray =
        s.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
