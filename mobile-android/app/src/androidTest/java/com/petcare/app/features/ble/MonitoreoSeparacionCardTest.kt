package com.petcare.app.features.ble

import android.content.Context
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.petcare.app.features.ble.data.local.MonitoreoSeparacionPreferences
import com.petcare.app.features.ble.data.remote.TagBleResponse
import com.petcare.app.features.ble.domain.SensibilidadSeparacion
import com.petcare.app.features.ble.service.ServicioEscaneoBle
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.ui.PetProfileScreen
import com.petcare.app.ui.theme.PetCareTheme
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Tarjeta de monitoreo de separacion del perfil de la mascota (US-35, P1-174).
 *
 * No necesita backend ni tag: el perfil se arma con datos fijos.
 */
@RunWith(AndroidJUnit4::class)
class MonitoreoSeparacionCardTest {

    @get:Rule
    val compose = createComposeRule()

    private val context: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private val preferencias = MonitoreoSeparacionPreferences(context)

    @Before
    fun otorgarPermisoDeNotificaciones() {
        // El dialogo del sistema queda fuera de la UI de Compose: se concede antes.
        InstrumentationRegistry.getInstrumentation().uiAutomation
            .executeShellCommand("pm grant ${context.packageName} android.permission.POST_NOTIFICATIONS")
            .close()
        limpiar()
    }

    @After
    fun limpiar() {
        preferencias.desactivarSeguimiento(TAG)
        preferencias.setSensibilidad(TAG, SensibilidadSeparacion.POR_DEFECTO)
        preferencias.setSilenciada(TAG, false)
        ServicioEscaneoBle.detener(context)
    }

    private fun mostrarPerfil() {
        compose.setContent {
            PetCareTheme {
                PetProfileScreen(
                    isLoading = false,
                    errorMessage = null,
                    pet = MASCOTA,
                    onRetry = {},
                    onBack = {},
                    tagBle = TagBleResponse(1, TAG, MASCOTA.id, "2026-09-26T12:00:00.000Z"),
                )
            }
        }
    }

    private val esSwitch = SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Switch)
    private fun switchMonitoreo() = compose.onAllNodes(esSwitch)[0]
    private fun switchSilenciar() = compose.onAllNodes(esSwitch)[1]

    @Test
    fun configurarSensibilidadYSilenciadoQuedaGuardado() {
        mostrarPerfil()

        // Apagado: no se ofrecen ajustes de algo que no esta corriendo.
        compose.onNodeWithText("Avisarme si se aleja").performScrollTo()
        compose.onAllNodesWithText("Sensibilidad").assertCountEquals(0)

        switchMonitoreo().performScrollTo().performClick()

        compose.onNodeWithText("Sensibilidad").performScrollTo()
        compose.onNodeWithText("Media").assertIsSelected()
        compose.onNodeWithText("Avisa a los 3 minutos sin detectarla").assertExists()

        compose.onNodeWithText("Alta").performScrollTo().performClick()
        compose.onNodeWithText("Alta").assertIsSelected()
        compose.onNodeWithText("Avisa a los 2 minutos sin detectarla").assertExists()

        switchSilenciar().performScrollTo().performClick()
        switchSilenciar().assertIsOn()

        // Lo que quedo en disco es lo que lee el service y lo que sobrevive a reiniciar.
        val guardadas = MonitoreoSeparacionPreferences(context)
        assertTrue(TAG in guardadas.tagsMonitoreados())
        assertEquals(SensibilidadSeparacion.ALTA, guardadas.sensibilidad(TAG))
        assertTrue(guardadas.estaSilenciada(TAG))
        assertEquals(MASCOTA.nombre, guardadas.nombreMascota(TAG))
    }

    @Test
    fun alAbrirElPerfilRecuperaLaConfiguracionGuardada() {
        // Simula una sesion anterior: la configuracion ya estaba en disco.
        preferencias.activarSeguimiento(TAG, MASCOTA.nombre)
        preferencias.setSensibilidad(TAG, SensibilidadSeparacion.BAJA)
        preferencias.setSilenciada(TAG, true)

        mostrarPerfil()

        switchMonitoreo().performScrollTo().assertIsOn()
        compose.onNodeWithText("Baja").performScrollTo().assertIsSelected()
        compose.onNodeWithText("Avisa a los 5 minutos sin detectarla").assertExists()
        switchSilenciar().performScrollTo().assertIsOn()
    }

    @Test
    fun desactivarElMonitoreoOcultaLosAjustesPeroNoLosBorra() {
        preferencias.activarSeguimiento(TAG, MASCOTA.nombre)
        preferencias.setSensibilidad(TAG, SensibilidadSeparacion.ALTA)

        mostrarPerfil()

        switchMonitoreo().performScrollTo().performClick()
        switchMonitoreo().assertIsOff()
        compose.onAllNodesWithText("Sensibilidad").assertCountEquals(0)

        assertTrue(TAG !in preferencias.tagsMonitoreados())
        // Si lo vuelve a prender, recupera lo que habia elegido.
        assertEquals(SensibilidadSeparacion.ALTA, preferencias.sensibilidad(TAG))
    }

    private companion object {
        const val TAG = "AABBCCDDEEFF"

        val MASCOTA = PetResponse(
            id = 999,
            nombre = "Firulais",
            especie = "Perro",
            raza = null,
            sexo = "Macho",
            birthDate = null,
            peso = null,
            esterilizado = false,
            foto = null,
            observaciones = null,
            alergias = null,
        )
    }
}
