package com.petcare.app.features.ble

import android.app.Notification
import android.app.NotificationManager
import android.content.Context
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.petcare.app.features.ble.data.local.ColaboracionPreferences
import com.petcare.app.features.ble.data.local.MonitoreoSeparacionPreferences
import com.petcare.app.features.ble.domain.SensibilidadSeparacion
import com.petcare.app.features.ble.service.ServicioEscaneoBle
import org.junit.After
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Alerta de separacion de punta a punta con el service real (US-35, P1-174).
 *
 * No necesita el tag fisico: la cuenta de cada tag arranca al activar el monitoreo, y
 * como ningun tag de estos existe, nunca llega una lectura y el detector los da por
 * separados al cumplir su umbral. Es exactamente el caso de una mascota que se alejo
 * apenas se prendio el monitoreo.
 *
 * Tarda unos 3 minutos: la sensibilidad mas alta avisa a los 2, y el service chequea
 * una vez por ventana de escaneo (60 s).
 */
@RunWith(AndroidJUnit4::class)
class AlertaSeparacionTest {

    private val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private val preferencias = MonitoreoSeparacionPreferences(context)
    private val notificaciones = context.getSystemService(NotificationManager::class.java)

    @Before
    fun preparar() {
        val permisos = listOf(
            "android.permission.POST_NOTIFICATIONS",
            "android.permission.ACCESS_FINE_LOCATION",
            "android.permission.ACCESS_COARSE_LOCATION",
            "android.permission.BLUETOOTH_SCAN",
        )
        val ui = InstrumentationRegistry.getInstrumentation().uiAutomation
        permisos.forEach { ui.executeShellCommand("pm grant ${context.packageName} $it").close() }

        // Que el escaneo corra solo por la separacion, sin mandar detecciones.
        ColaboracionPreferences(context).setActiva(false)
        notificaciones.cancelAll()
        limpiar()
    }

    @After
    fun limpiar() {
        listOf(TAG_ALTA, TAG_SILENCIADA, TAG_BAJA).forEach {
            preferencias.desactivarSeguimiento(it)
            preferencias.setSilenciada(it, false)
            preferencias.setSensibilidad(it, SensibilidadSeparacion.POR_DEFECTO)
        }
        ServicioEscaneoBle.detener(context)
    }

    @Test
    fun avisaConNombreYHoraRespetaElUmbralYElSilenciado() {
        configurar(TAG_ALTA, "Firulais", SensibilidadSeparacion.ALTA, silenciada = false)
        configurar(TAG_SILENCIADA, "Michi", SensibilidadSeparacion.ALTA, silenciada = true)
        configurar(TAG_BAJA, "Rocco", SensibilidadSeparacion.BAJA, silenciada = false)

        ServicioEscaneoBle.iniciar(context)

        val alerta = esperarAlerta("Firulais se alejó", timeoutMillis = 4 * 60 * 1000L)
        assertNotNull("No aparecio la alerta de Firulais", alerta)

        val texto = alerta!!.extras.getCharSequence(Notification.EXTRA_TEXT).toString()
        assertTrue("El texto no dice la hora: $texto", Regex("""a las \d{2}:\d{2}""").containsMatchIn(texto))
        assertTrue(alerta.`when` > 0)

        // Michi tiene el mismo umbral que Firulais, asi que ya se detecto su separacion:
        // si no hay alerta es por el silenciado, no porque falte tiempo.
        assertNull("Michi esta silenciada y aun asi sono", buscarAlerta("Michi se alejó"))

        // Rocco esta en sensibilidad baja (5 min): a esta altura todavia no tiene que avisar.
        assertNull("Rocco aviso antes de su umbral", buscarAlerta("Rocco se alejó"))
    }

    private fun configurar(
        tagId: String,
        nombre: String,
        sensibilidad: SensibilidadSeparacion,
        silenciada: Boolean,
    ) {
        preferencias.activarSeguimiento(tagId, nombre)
        preferencias.setSensibilidad(tagId, sensibilidad)
        preferencias.setSilenciada(tagId, silenciada)
    }

    private fun esperarAlerta(titulo: String, timeoutMillis: Long): Notification? {
        val limite = SystemClock.elapsedRealtime() + timeoutMillis
        while (SystemClock.elapsedRealtime() < limite) {
            buscarAlerta(titulo)?.let { return it }
            SystemClock.sleep(2_000)
        }
        return null
    }

    private fun buscarAlerta(titulo: String): Notification? =
        notificaciones.activeNotifications
            .map { it.notification }
            .firstOrNull {
                it.channelId == "petcare_alerta_separacion" &&
                    it.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() == titulo
            }

    private companion object {
        const val TAG_ALTA = "A00000000001"
        const val TAG_SILENCIADA = "A00000000002"
        const val TAG_BAJA = "A00000000003"
    }
}
