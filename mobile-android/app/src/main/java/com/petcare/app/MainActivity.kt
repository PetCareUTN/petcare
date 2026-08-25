package com.petcare.app

import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import com.petcare.app.features.adopciones.data.remote.PublicacionAdopcionResponse
import com.petcare.app.features.adopciones.data.remote.SolicitudAdopcionResponse
import com.petcare.app.features.adopciones.domain.AdopcionesController
import com.petcare.app.features.adopciones.domain.SolicitudesAdopcionController
import com.petcare.app.features.adopciones.ui.AdopcionDetalleScreen
import com.petcare.app.features.adopciones.ui.AdopcionesListScreen
import com.petcare.app.features.adopciones.ui.MisPublicacionesAdopcionScreen
import com.petcare.app.features.adopciones.ui.PublicarAdopcionScreen
import com.petcare.app.features.adopciones.ui.SolicitudesRecibidasScreen
import com.petcare.app.features.auth.data.local.SessionManager
import com.petcare.app.features.auth.data.remote.ForgotPasswordRequest
import com.petcare.app.features.auth.data.remote.ResetPasswordRequest
import com.petcare.app.features.auth.data.remote.RetrofitClient
import com.petcare.app.features.auth.domain.AuthSessionController
import com.petcare.app.features.auth.ui.ForgotPasswordScreen
import com.petcare.app.features.auth.ui.LoginScreen
import com.petcare.app.features.auth.ui.ResetPasswordScreen
import com.petcare.app.features.auth.ui.AuthenticatedHomeScreen
import com.petcare.app.features.auth.ui.RegisterScreen
import com.petcare.app.features.historiaclinica.data.remote.EventoClinicoResponse
import com.petcare.app.features.historiaclinica.domain.HistoriaClinicaController
import com.petcare.app.features.historiaclinica.export.ExportStorage
import com.petcare.app.features.historiaclinica.export.HistoriaClinicaPdfGenerator
import com.petcare.app.features.historiaclinica.export.MedicalFilesDownloader
import com.petcare.app.features.historiaclinica.ui.HistoriaClinicaScreen
import com.petcare.app.features.pets.data.remote.CreatePetRequest
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.data.remote.UpdatePetRequest
import com.petcare.app.features.pets.domain.PetsController
import com.petcare.app.features.pets.ui.EditPetScreen
import com.petcare.app.features.pets.ui.PetProfileScreen
import com.petcare.app.features.pets.ui.RegisterPetScreen
import com.petcare.app.features.profile.data.remote.UpdateProfileRequest
import com.petcare.app.features.profile.data.remote.UserProfileResponse
import com.petcare.app.features.profile.domain.ProfileController
import com.petcare.app.features.profile.ui.ChangeEmailScreen
import com.petcare.app.features.profile.ui.EditProfileScreen
import com.petcare.app.features.profile.ui.ProfileScreen
import com.petcare.app.features.settings.data.local.ThemePreferences
import com.petcare.app.features.settings.ui.ConfiguracionScreen
import com.petcare.app.features.servicios.data.remote.CreateServicioRequest
import com.petcare.app.features.servicios.data.remote.DisponibilidadRequest
import com.petcare.app.features.servicios.data.remote.ServicioResponse
import com.petcare.app.features.servicios.data.remote.UpdateServicioRequest
import com.petcare.app.features.servicios.domain.ServiciosController
import com.petcare.app.features.servicios.ui.ServicioFormScreen
import com.petcare.app.features.servicios.ui.ServiciosListScreen
import com.petcare.app.features.turnos.data.remote.CreateTurnoRequest
import com.petcare.app.features.turnos.data.remote.DisponibilidadTurnoResponse
import com.petcare.app.features.turnos.data.remote.MiTurnoResponse
import com.petcare.app.features.turnos.data.remote.VeterinariaResponse
import com.petcare.app.features.turnos.domain.TurnosController
import com.petcare.app.features.turnos.ui.MisTurnosScreen
import com.petcare.app.features.turnos.ui.SolicitarTurnoScreen
import com.petcare.app.ui.theme.PetCareTheme
import java.io.IOException
import java.net.URLConnection
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException

private enum class AuthScreen {
    LOGIN,
    FORGOT_PASSWORD,
    RESET_PASSWORD
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val themePreferences = remember {
                ThemePreferences(applicationContext)
            }
            val systemInDarkTheme = isSystemInDarkTheme()
            // null = seguir el tema del sistema hasta que el usuario elija.
            var darkModePreference by remember {
                mutableStateOf(themePreferences.getDarkMode())
            }
            val isDarkMode = darkModePreference ?: systemInDarkTheme

            PetCareTheme(darkTheme = isDarkMode) {
                val sessionStore = remember {
                    SessionManager(applicationContext)
                }
                val sessionController = remember {
                    AuthSessionController(
                        authApi = RetrofitClient.authApi(sessionStore),
                        sessionStore = sessionStore
                    )
                }
                val petsController = remember {
                    PetsController(
                        petsApi = RetrofitClient.petsApi(sessionStore)
                    )
                }
                val historiaClinicaController = remember {
                    HistoriaClinicaController(
                        historiaClinicaApi = RetrofitClient.historiaClinicaApi(sessionStore)
                    )
                }
                val profileController = remember {
                    ProfileController(
                        profileApi = RetrofitClient.profileApi(sessionStore)
                    )
                }
                val adopcionesController = remember {
                    AdopcionesController(
                        adopcionesApi = RetrofitClient.adopcionesApi(sessionStore)
                    )
                }
                val solicitudesAdopcionController = remember {
                    SolicitudesAdopcionController(
                        solicitudesAdopcionApi = RetrofitClient.solicitudesAdopcionApi(sessionStore)
                    )
                }
                val serviciosController = remember {
                    ServiciosController(
                        serviciosApi = RetrofitClient.serviciosApi(sessionStore)
                    )
                }
                val turnosController = remember {
                    TurnosController(
                        turnosApi = RetrofitClient.turnosApi(sessionStore)
                    )
                }
                var isLoading by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingPets by rememberSaveable {
                    mutableStateOf(false)
                }
                var isSavingPet by rememberSaveable {
                    mutableStateOf(false)
                }
                var isRestoringSession by rememberSaveable {
                    mutableStateOf(true)
                }
                var serverError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var petsError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var savePetError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var loggedUserName by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var currentScreen by rememberSaveable {
                    mutableStateOf(AuthScreen.LOGIN)
                }
                var resetEmail by rememberSaveable {
                    mutableStateOf("")
                }
                var forgotPasswordSuccess by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var resetPasswordSuccess by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var isRegisteringPet by rememberSaveable {
                    mutableStateOf(false)
                }
                var isUpdatingPet by rememberSaveable {
                    mutableStateOf(false)
                }
                var updatePetError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var editingPet by remember {
                    mutableStateOf<PetResponse?>(null)
                }
                var pets by remember {
                    mutableStateOf<List<PetResponse>>(emptyList())
                }
                var isRegisteringUser by rememberSaveable {
                    mutableStateOf(false)
                }
                var isRegisterLoading by rememberSaveable {
                    mutableStateOf(false)
                }
                var registerError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var registerSuccessMessage by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var selectedPetId by rememberSaveable {
                    mutableStateOf<Int?>(null)
                }
                var selectedPet by remember {
                    mutableStateOf<PetResponse?>(null)
                }
                var isLoadingPetProfile by rememberSaveable {
                    mutableStateOf(false)
                }
                var petProfileError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var isViewingHistoria by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingHistoria by rememberSaveable {
                    mutableStateOf(false)
                }
                var historiaError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var historiaEventos by remember {
                    mutableStateOf<List<EventoClinicoResponse>>(emptyList())
                }
                var isExportingHistoria by rememberSaveable {
                    mutableStateOf(false)
                }
                var exportHistoriaMessage by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var isViewingProfile by rememberSaveable {
                    mutableStateOf(false)
                }
                var isEditingProfile by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingProfile by rememberSaveable {
                    mutableStateOf(false)
                }
                var isSavingProfile by rememberSaveable {
                    mutableStateOf(false)
                }
                var profileError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var saveProfileError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var profile by remember {
                    mutableStateOf<UserProfileResponse?>(null)
                }
                var isChangingEmail by rememberSaveable {
                    mutableStateOf(false)
                }
                var isEmailCodeSent by rememberSaveable {
                    mutableStateOf(false)
                }
                var isProcessingEmailChange by rememberSaveable {
                    mutableStateOf(false)
                }
                var emailChangeError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var isPublishingAdopcion by rememberSaveable {
                    mutableStateOf(false)
                }
                var isSavingAdopcion by rememberSaveable {
                    mutableStateOf(false)
                }
                var adopcionError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var adopcionSuccess by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var isViewingAdopciones by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingAdopciones by rememberSaveable {
                    mutableStateOf(false)
                }
                var adopcionesListError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var adopciones by remember {
                    mutableStateOf<List<PublicacionAdopcionResponse>>(emptyList())
                }
                var isViewingAdopcionDetalle by rememberSaveable {
                    mutableStateOf(false)
                }
                var selectedAdopcionId by rememberSaveable {
                    mutableStateOf<Int?>(null)
                }
                var selectedAdopcion by remember {
                    mutableStateOf<PublicacionAdopcionResponse?>(null)
                }
                var isLoadingAdopcionDetalle by rememberSaveable {
                    mutableStateOf(false)
                }
                var adopcionDetalleError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var isRequestingAdopcion by rememberSaveable {
                    mutableStateOf(false)
                }
                var adopcionRequestError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var adopcionRequestSuccess by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var isViewingSolicitudesRecibidas by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingSolicitudesRecibidas by rememberSaveable {
                    mutableStateOf(false)
                }
                var solicitudesRecibidasError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var solicitudesRecibidas by remember {
                    mutableStateOf<List<SolicitudAdopcionResponse>>(emptyList())
                }
                var procesandoSolicitudId by rememberSaveable {
                    mutableStateOf<Int?>(null)
                }
                var isViewingMisPublicaciones by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingMisPublicaciones by rememberSaveable {
                    mutableStateOf(false)
                }
                var misPublicacionesError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var misPublicaciones by remember {
                    mutableStateOf<List<PublicacionAdopcionResponse>>(emptyList())
                }
                var isViewingSettings by rememberSaveable {
                    mutableStateOf(false)
                }
                var isViewingServicios by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingServicios by rememberSaveable {
                    mutableStateOf(false)
                }
                var serviciosError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var servicios by remember {
                    mutableStateOf<List<ServicioResponse>>(emptyList())
                }
                var isCreatingServicio by rememberSaveable {
                    mutableStateOf(false)
                }
                var editingServicio by remember {
                    mutableStateOf<ServicioResponse?>(null)
                }
                var isSavingServicio by rememberSaveable {
                    mutableStateOf(false)
                }
                var saveServicioError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var deletingServicioId by rememberSaveable {
                    mutableStateOf<Int?>(null)
                }
                var isRequestingTurno by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingVeterinariasTurno by rememberSaveable {
                    mutableStateOf(false)
                }
                var veterinariasTurno by remember {
                    mutableStateOf<List<VeterinariaResponse>>(emptyList())
                }
                var isLoadingDisponibilidadesTurno by rememberSaveable {
                    mutableStateOf(false)
                }
                var disponibilidadesTurno by remember {
                    mutableStateOf<List<DisponibilidadTurnoResponse>>(emptyList())
                }
                var isSavingTurno by rememberSaveable {
                    mutableStateOf(false)
                }
                var turnoError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var turnoSuccess by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var isViewingMisTurnos by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingMisTurnos by rememberSaveable {
                    mutableStateOf(false)
                }
                var misTurnosError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var misTurnos by remember {
                    mutableStateOf<List<MiTurnoResponse>>(emptyList())
                }

                fun logout() {
                    sessionController.logout()
                    loggedUserName = null
                    pets = emptyList()
                    serverError = null
                    petsError = null
                    savePetError = null
                    isRegisteringPet = false
                    updatePetError = null
                    editingPet = null
                    selectedPetId = null
                    selectedPet = null
                    petProfileError = null
                    isViewingHistoria = false
                    historiaError = null
                    historiaEventos = emptyList()
                    isViewingProfile = false
                    isEditingProfile = false
                    profileError = null
                    saveProfileError = null
                    profile = null
                    isChangingEmail = false
                    isEmailCodeSent = false
                    isProcessingEmailChange = false
                    emailChangeError = null
                    isPublishingAdopcion = false
                    isSavingAdopcion = false
                    adopcionError = null
                    adopcionSuccess = null
                    isViewingAdopciones = false
                    isLoadingAdopciones = false
                    adopcionesListError = null
                    adopciones = emptyList()
                    isViewingAdopcionDetalle = false
                    selectedAdopcionId = null
                    selectedAdopcion = null
                    isLoadingAdopcionDetalle = false
                    adopcionDetalleError = null
                    isRequestingAdopcion = false
                    adopcionRequestError = null
                    adopcionRequestSuccess = null
                    isViewingSolicitudesRecibidas = false
                    isLoadingSolicitudesRecibidas = false
                    solicitudesRecibidasError = null
                    solicitudesRecibidas = emptyList()
                    procesandoSolicitudId = null
                    isViewingMisPublicaciones = false
                    isLoadingMisPublicaciones = false
                    misPublicacionesError = null
                    misPublicaciones = emptyList()
                    isViewingSettings = false
                    isViewingServicios = false
                    serviciosError = null
                    servicios = emptyList()
                    isCreatingServicio = false
                    editingServicio = null
                    saveServicioError = null
                    deletingServicioId = null
                    isRequestingTurno = false
                    veterinariasTurno = emptyList()
                    disponibilidadesTurno = emptyList()
                    turnoError = null
                    turnoSuccess = null
                    isViewingMisTurnos = false
                    isLoadingMisTurnos = false
                    misTurnosError = null
                    misTurnos = emptyList()
                }

                fun loadPets() {
                    isLoadingPets = true
                    petsError = null

                    lifecycleScope.launch {
                        try {
                            pets = petsController.getMyPets()
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                petsError = "No se pudieron cargar tus mascotas"
                            }
                        } catch (exception: IOException) {
                            petsError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            petsError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingPets = false
                        }
                    }
                }

                fun loadPetProfile(id: Int) {
                    isLoadingPetProfile = true
                    petProfileError = null

                    lifecycleScope.launch {
                        try {
                            selectedPet = petsController.getPetById(id)
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                petProfileError = "No se pudo cargar el perfil de la mascota"
                            }
                        } catch (exception: IOException) {
                            petProfileError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            petProfileError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingPetProfile = false
                        }
                    }
                }

                fun loadHistoriaClinica(idMascota: Int) {
                    isLoadingHistoria = true
                    historiaError = null

                    lifecycleScope.launch {
                        try {
                            val historia = historiaClinicaController.getHistoriaClinica(idMascota)
                            historiaEventos = historia.eventos
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                historiaError = "No se pudo cargar la historia clinica"
                            }
                        } catch (exception: IOException) {
                            historiaError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            historiaError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingHistoria = false
                        }
                    }
                }

                fun loadProfile() {
                    isLoadingProfile = true
                    profileError = null

                    lifecycleScope.launch {
                        try {
                            profile = profileController.getMyProfile()
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                profileError = "No se pudo cargar tu perfil"
                            }
                        } catch (exception: IOException) {
                            profileError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            profileError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingProfile = false
                        }
                    }
                }

                fun loadServicios() {
                    isLoadingServicios = true
                    serviciosError = null

                    lifecycleScope.launch {
                        try {
                            servicios = serviciosController.getMyServicios()
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                serviciosError = "No se pudieron cargar tus servicios"
                            }
                        } catch (exception: IOException) {
                            serviciosError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            serviciosError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingServicios = false
                        }
                    }
                }

                fun loadAdopciones() {
                    isLoadingAdopciones = true
                    adopcionesListError = null

                    lifecycleScope.launch {
                        try {
                            adopciones = adopcionesController.listar()
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                adopcionesListError = "No se pudieron cargar las mascotas en adopcion"
                            }
                        } catch (exception: IOException) {
                            adopcionesListError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            adopcionesListError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingAdopciones = false
                        }
                    }
                }

                fun loadAdopcionDetalle(idPublicacion: Int) {
                    isLoadingAdopcionDetalle = true
                    adopcionDetalleError = null

                    lifecycleScope.launch {
                        try {
                            selectedAdopcion = adopcionesController.obtenerDetalle(idPublicacion)
                        } catch (exception: HttpException) {
                            adopcionDetalleError = when (exception.code()) {
                                401 -> {
                                    logout()
                                    serverError = "La sesion expiro. Inicia sesion nuevamente"
                                    null
                                }
                                404 -> "La publicacion ya no esta disponible"
                                else -> "No se pudo cargar el detalle de la publicacion"
                            }
                        } catch (exception: IOException) {
                            adopcionDetalleError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            adopcionDetalleError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingAdopcionDetalle = false
                        }
                    }
                }

                fun loadMisPublicaciones() {
                    isLoadingMisPublicaciones = true
                    misPublicacionesError = null

                    lifecycleScope.launch {
                        try {
                            misPublicaciones = adopcionesController.listarMias()
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                misPublicacionesError = "No se pudieron cargar tus publicaciones"
                            }
                        } catch (exception: IOException) {
                            misPublicacionesError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            misPublicacionesError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingMisPublicaciones = false
                        }
                    }
                }

                fun loadSolicitudesRecibidas() {
                    isLoadingSolicitudesRecibidas = true
                    solicitudesRecibidasError = null

                    lifecycleScope.launch {
                        try {
                            solicitudesRecibidas = solicitudesAdopcionController.listarRecibidas()
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                solicitudesRecibidasError = "No se pudieron cargar las solicitudes recibidas"
                            }
                        } catch (exception: IOException) {
                            solicitudesRecibidasError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            solicitudesRecibidasError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingSolicitudesRecibidas = false
                        }
                    }
                }

                fun loadMisTurnos() {
                    isLoadingMisTurnos = true
                    misTurnosError = null

                    lifecycleScope.launch {
                        try {
                            misTurnos = turnosController.getMisTurnos()
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                misTurnosError = "No se pudieron cargar tus turnos"
                            }
                        } catch (exception: IOException) {
                            misTurnosError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            misTurnosError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingMisTurnos = false
                        }
                    }
                }

                fun loadVeterinariasTurno() {
                    isLoadingVeterinariasTurno = true

                    lifecycleScope.launch {
                        try {
                            veterinariasTurno = turnosController.getVeterinariasAprobadas()
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                turnoError = "No se pudieron cargar las veterinarias"
                            }
                        } catch (exception: IOException) {
                            turnoError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            turnoError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingVeterinariasTurno = false
                        }
                    }
                }

                fun loadDisponibilidadesTurno(idVeterinario: Int) {
                    isLoadingDisponibilidadesTurno = true

                    lifecycleScope.launch {
                        try {
                            disponibilidadesTurno = turnosController.getDisponibilidades(idVeterinario)
                        } catch (exception: HttpException) {
                            if (exception.code() == 401) {
                                logout()
                                serverError = "La sesion expiro. Inicia sesion nuevamente"
                            } else {
                                turnoError = "No se pudo cargar la disponibilidad de la veterinaria"
                            }
                        } catch (exception: IOException) {
                            turnoError = "No se pudo conectar con el servidor"
                        } catch (exception: Exception) {
                            turnoError = "Ocurrio un error inesperado"
                        } finally {
                            isLoadingDisponibilidadesTurno = false
                        }
                    }
                }

                LaunchedEffect(Unit) {
                    val restoredSession = sessionController.restoreSession()
                    loggedUserName = restoredSession?.userName
                    isRestoringSession = false

                    if (restoredSession != null) {
                        loadPets()
                    }
                }

                if (isRestoringSession) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (loggedUserName != null && isRegisteringPet) {
                    RegisterPetScreen(
                        isSaving = isSavingPet,
                        saveError = savePetError,
                        onSave = { request, photoUri ->
                            isSavingPet = true
                            savePetError = null

                            lifecycleScope.launch {
                                try {
                                    createPet(
                                        petsController = petsController,
                                        request = request,
                                        photoUri = photoUri
                                    )
                                    isRegisteringPet = false
                                    loadPets()
                                } catch (exception: HttpException) {
                                    if (exception.code() == 401) {
                                        logout()
                                        serverError =
                                            "La sesion expiro. Inicia sesion nuevamente"
                                    } else {
                                        savePetError = "No se pudo registrar la mascota"
                                    }
                                } catch (exception: IOException) {
                                    savePetError = "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    savePetError = "Ocurrio un error inesperado"
                                } finally {
                                    isSavingPet = false
                                }
                            }
                        },
                        onCancel = {
                            savePetError = null
                            isRegisteringPet = false
                        }
                    )
                } else if (loggedUserName != null && editingPet != null) {
                    EditPetScreen(
                        pet = editingPet!!,
                        isSaving = isUpdatingPet,
                        saveError = updatePetError,
                        onSave = { request, photoUri ->
                            isUpdatingPet = true
                            updatePetError = null

                            lifecycleScope.launch {
                                try {
                                    updatePet(
                                        petsController = petsController,
                                        id = editingPet!!.id,
                                        request = request,
                                        photoUri = photoUri
                                    )
                                    editingPet = null
                                    loadPets()
                                } catch (exception: HttpException) {
                                    if (exception.code() == 401) {
                                        logout()
                                        serverError =
                                            "La sesion expiro. Inicia sesion nuevamente"
                                    } else {
                                        updatePetError = "No se pudo actualizar la mascota"
                                    }
                                } catch (exception: IOException) {
                                    updatePetError = "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    updatePetError = "Ocurrio un error inesperado"
                                } finally {
                                    isUpdatingPet = false
                                }
                            }
                        },
                        onCancel = {
                            updatePetError = null
                            editingPet = null
                        }
                    )
                } else if (loggedUserName != null && (isCreatingServicio || editingServicio != null)) {
                    ServicioFormScreen(
                        servicio = editingServicio,
                        isSaving = isSavingServicio,
                        saveError = saveServicioError,
                        onSave = { categoria, descripcion, disponibilidades ->
                            isSavingServicio = true
                            saveServicioError = null

                            lifecycleScope.launch {
                                try {
                                    val servicioSiendoEditado = editingServicio
                                    if (servicioSiendoEditado == null) {
                                        serviciosController.createServicio(
                                            CreateServicioRequest(
                                                categoria = categoria,
                                                descripcion = descripcion,
                                                disponibilidades = disponibilidades
                                            )
                                        )
                                    } else {
                                        serviciosController.updateServicio(
                                            servicioSiendoEditado.id,
                                            UpdateServicioRequest(
                                                categoria = categoria,
                                                descripcion = descripcion,
                                                disponibilidades = disponibilidades
                                            )
                                        )
                                    }
                                    isCreatingServicio = false
                                    editingServicio = null
                                    loadServicios()
                                } catch (exception: HttpException) {
                                    if (exception.code() == 401) {
                                        logout()
                                        serverError =
                                            "La sesion expiro. Inicia sesion nuevamente"
                                    } else {
                                        saveServicioError = "No se pudo guardar el servicio"
                                    }
                                } catch (exception: IOException) {
                                    saveServicioError = "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    saveServicioError = "Ocurrio un error inesperado"
                                } finally {
                                    isSavingServicio = false
                                }
                            }
                        },
                        onCancel = {
                            saveServicioError = null
                            isCreatingServicio = false
                            editingServicio = null
                        }
                    )
                } else if (loggedUserName != null && isViewingAdopcionDetalle) {
                    AdopcionDetalleScreen(
                        isLoading = isLoadingAdopcionDetalle,
                        errorMessage = adopcionDetalleError,
                        publicacion = selectedAdopcion,
                        isRequesting = isRequestingAdopcion,
                        requestError = adopcionRequestError,
                        requestSuccess = adopcionRequestSuccess,
                        onBack = {
                            isViewingAdopcionDetalle = false
                            selectedAdopcionId = null
                            selectedAdopcion = null
                            adopcionDetalleError = null
                            adopcionRequestError = null
                            adopcionRequestSuccess = null
                        },
                        onRetry = {
                            selectedAdopcionId?.let { loadAdopcionDetalle(it) }
                        },
                        onSolicitarAdopcion = {
                            val idPublicacion = selectedAdopcionId
                            if (idPublicacion != null) {
                                isRequestingAdopcion = true
                                adopcionRequestError = null

                                lifecycleScope.launch {
                                    try {
                                        solicitudesAdopcionController.solicitar(idPublicacion)
                                        adopcionRequestSuccess =
                                            "Tu solicitud fue enviada. El dueño va a revisarla."
                                    } catch (exception: HttpException) {
                                        adopcionRequestError = when (exception.code()) {
                                            401 -> {
                                                logout()
                                                serverError =
                                                    "La sesion expiro. Inicia sesion nuevamente"
                                                null
                                            }
                                            403 -> "No podés solicitar la adopción de tu propia publicación"
                                            404 -> "La publicación ya no está disponible"
                                            409 -> "Ya tenés una solicitud pendiente para esta publicación"
                                            else -> "No se pudo enviar la solicitud"
                                        }
                                    } catch (exception: IOException) {
                                        adopcionRequestError = "No se pudo conectar con el servidor"
                                    } catch (exception: Exception) {
                                        adopcionRequestError = "Ocurrio un error inesperado"
                                    } finally {
                                        isRequestingAdopcion = false
                                    }
                                }
                            }
                        }
                    )
                } else if (loggedUserName != null && isPublishingAdopcion) {
                    PublicarAdopcionScreen(
                        pets = pets,
                        isPublishing = isSavingAdopcion,
                        errorMessage = adopcionError,
                        successMessage = adopcionSuccess,
                        onPublish = { petId, descripcion ->
                            isSavingAdopcion = true
                            adopcionError = null

                            lifecycleScope.launch {
                                try {
                                    adopcionesController.publicar(petId, descripcion)
                                    adopcionSuccess =
                                        "Tu mascota ya está publicada en adopción"
                                } catch (exception: HttpException) {
                                    adopcionError = when (exception.code()) {
                                        401 -> {
                                            logout()
                                            serverError =
                                                "La sesion expiro. Inicia sesion nuevamente"
                                            null
                                        }
                                        403 -> "No podés publicar una mascota que no es tuya"
                                        409 -> "Esa mascota ya tiene una publicación activa"
                                        404 -> "No se encontró la mascota"
                                        else -> "No se pudo publicar la mascota"
                                    }
                                } catch (exception: IOException) {
                                    adopcionError = "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    adopcionError = "Ocurrio un error inesperado"
                                } finally {
                                    isSavingAdopcion = false
                                }
                            }
                        },
                        onRegisterNewPet = {
                            savePetError = null
                            isRegisteringPet = true
                        },
                        onBack = {
                            isPublishingAdopcion = false
                            adopcionError = null
                            adopcionSuccess = null
                            if (isViewingAdopciones) {
                                loadAdopciones()
                            }
                        }
                    )
                } else if (loggedUserName != null && isViewingMisPublicaciones) {
                    MisPublicacionesAdopcionScreen(
                        isLoading = isLoadingMisPublicaciones,
                        errorMessage = misPublicacionesError,
                        publicaciones = misPublicaciones,
                        onBack = {
                            isViewingMisPublicaciones = false
                            misPublicacionesError = null
                        },
                        onRetry = { loadMisPublicaciones() }
                    )
                } else if (loggedUserName != null && isViewingSolicitudesRecibidas) {
                    SolicitudesRecibidasScreen(
                        isLoading = isLoadingSolicitudesRecibidas,
                        errorMessage = solicitudesRecibidasError,
                        solicitudes = solicitudesRecibidas,
                        processingId = procesandoSolicitudId,
                        onBack = {
                            isViewingSolicitudesRecibidas = false
                            solicitudesRecibidasError = null
                        },
                        onRetry = { loadSolicitudesRecibidas() },
                        onAceptar = { solicitud ->
                            procesandoSolicitudId = solicitud.idSolicitud
                            solicitudesRecibidasError = null

                            lifecycleScope.launch {
                                try {
                                    val actualizada =
                                        solicitudesAdopcionController.aceptar(solicitud.idSolicitud)
                                    solicitudesRecibidas = solicitudesRecibidas.map {
                                        if (it.idSolicitud == actualizada.idSolicitud) actualizada else it
                                    }
                                } catch (exception: HttpException) {
                                    if (exception.code() == 401) {
                                        logout()
                                        serverError = "La sesion expiro. Inicia sesion nuevamente"
                                    } else {
                                        solicitudesRecibidasError = "No se pudo aceptar la solicitud"
                                    }
                                } catch (exception: IOException) {
                                    solicitudesRecibidasError = "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    solicitudesRecibidasError = "Ocurrio un error inesperado"
                                } finally {
                                    procesandoSolicitudId = null
                                }
                            }
                        },
                        onRechazar = { solicitud, motivo ->
                            procesandoSolicitudId = solicitud.idSolicitud
                            solicitudesRecibidasError = null

                            lifecycleScope.launch {
                                try {
                                    val actualizada = solicitudesAdopcionController.rechazar(
                                        solicitud.idSolicitud,
                                        motivo,
                                    )
                                    solicitudesRecibidas = solicitudesRecibidas.map {
                                        if (it.idSolicitud == actualizada.idSolicitud) actualizada else it
                                    }
                                } catch (exception: HttpException) {
                                    if (exception.code() == 401) {
                                        logout()
                                        serverError = "La sesion expiro. Inicia sesion nuevamente"
                                    } else {
                                        solicitudesRecibidasError = "No se pudo rechazar la solicitud"
                                    }
                                } catch (exception: IOException) {
                                    solicitudesRecibidasError = "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    solicitudesRecibidasError = "Ocurrio un error inesperado"
                                } finally {
                                    procesandoSolicitudId = null
                                }
                            }
                        }
                    )
                } else if (loggedUserName != null && isViewingAdopciones) {
                    AdopcionesListScreen(
                        isLoading = isLoadingAdopciones,
                        errorMessage = adopcionesListError,
                        publicaciones = adopciones,
                        onNavigateHome = {
                            isViewingAdopciones = false
                            adopcionesListError = null
                        },
                        onNavigateServicios = {
                            isViewingAdopciones = false
                            adopcionesListError = null
                            saveServicioError = null
                            serviciosError = null
                            isViewingServicios = true
                            loadServicios()
                        },
                        onNavigateTurnos = {
                            isViewingAdopciones = false
                            adopcionesListError = null
                            misTurnosError = null
                            isViewingMisTurnos = true
                            loadMisTurnos()
                        },
                        onRetry = { loadAdopciones() },
                        onPublicacionClick = { publicacion ->
                            selectedAdopcionId = publicacion.idPublicacion
                            selectedAdopcion = null
                            adopcionDetalleError = null
                            adopcionRequestError = null
                            adopcionRequestSuccess = null
                            isViewingAdopcionDetalle = true
                            loadAdopcionDetalle(publicacion.idPublicacion)
                        },
                        onAddClick = {
                            adopcionError = null
                            adopcionSuccess = null
                            isPublishingAdopcion = true
                        },
                        onSolicitudesRecibidasClick = {
                            solicitudesRecibidasError = null
                            isViewingSolicitudesRecibidas = true
                            loadSolicitudesRecibidas()
                        },
                        onMisPublicacionesClick = {
                            misPublicacionesError = null
                            isViewingMisPublicaciones = true
                            loadMisPublicaciones()
                        }
                    )
                } else if (loggedUserName != null && isViewingServicios) {
                    ServiciosListScreen(
                        isLoading = isLoadingServicios,
                        errorMessage = serviciosError,
                        servicios = servicios,
                        deletingId = deletingServicioId,
                        onBack = {
                            isViewingServicios = false
                            serviciosError = null
                        },
                        onRetry = { loadServicios() },
                        onCreateServicio = {
                            saveServicioError = null
                            isCreatingServicio = true
                        },
                        onEditServicio = { servicio ->
                            saveServicioError = null
                            editingServicio = servicio
                        },
                        onDeleteServicio = { servicio ->
                            deletingServicioId = servicio.id
                            serviciosError = null

                            lifecycleScope.launch {
                                try {
                                    serviciosController.deleteServicio(servicio.id)
                                    servicios = servicios.filter { it.id != servicio.id }
                                } catch (exception: HttpException) {
                                    if (exception.code() == 401) {
                                        logout()
                                        serverError =
                                            "La sesion expiro. Inicia sesion nuevamente"
                                    } else {
                                        serviciosError = "No se pudo eliminar el servicio"
                                    }
                                } catch (exception: IOException) {
                                    serviciosError = "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    serviciosError = "Ocurrio un error inesperado"
                                } finally {
                                    deletingServicioId = null
                                }
                            }
                        }
                    )
                } else if (loggedUserName != null && isChangingEmail) {
                    profile?.let { currentProfile ->
                        ChangeEmailScreen(
                            currentEmail = currentProfile.email,
                            isCodeSent = isEmailCodeSent,
                            isLoading = isProcessingEmailChange,
                            serverError = emailChangeError,
                            onRequestCode = { nuevoEmail ->
                                isProcessingEmailChange = true
                                emailChangeError = null

                                lifecycleScope.launch {
                                    try {
                                        profileController.requestEmailChange(nuevoEmail)
                                        isEmailCodeSent = true
                                    } catch (exception: HttpException) {
                                        emailChangeError = when (exception.code()) {
                                            401 -> {
                                                logout()
                                                serverError =
                                                    "La sesion expiro. Inicia sesion nuevamente"
                                                null
                                            }
                                            409 -> "Ese correo ya esta en uso"
                                            400 -> "Revisa los datos ingresados"
                                            else -> "No se pudo enviar el codigo"
                                        }
                                    } catch (exception: IOException) {
                                        emailChangeError = "No se pudo conectar con el servidor"
                                    } catch (exception: Exception) {
                                        emailChangeError = "Ocurrio un error inesperado"
                                    } finally {
                                        isProcessingEmailChange = false
                                    }
                                }
                            },
                            onConfirmCode = { codigo ->
                                isProcessingEmailChange = true
                                emailChangeError = null

                                lifecycleScope.launch {
                                    try {
                                        profileController.confirmEmailChange(codigo)
                                        isChangingEmail = false
                                        isEmailCodeSent = false
                                        isViewingProfile = true
                                        loadProfile()
                                    } catch (exception: HttpException) {
                                        emailChangeError = when (exception.code()) {
                                            401 -> {
                                                logout()
                                                serverError =
                                                    "La sesion expiro. Inicia sesion nuevamente"
                                                null
                                            }
                                            409 -> "Ese correo ya esta en uso"
                                            400 -> "Codigo invalido o expirado"
                                            else -> "No se pudo confirmar el cambio de email"
                                        }
                                    } catch (exception: IOException) {
                                        emailChangeError = "No se pudo conectar con el servidor"
                                    } catch (exception: Exception) {
                                        emailChangeError = "Ocurrio un error inesperado"
                                    } finally {
                                        isProcessingEmailChange = false
                                    }
                                }
                            },
                            onCancel = {
                                isChangingEmail = false
                                isEmailCodeSent = false
                                emailChangeError = null
                                isEditingProfile = true
                            }
                        )
                    }
                } else if (loggedUserName != null && isEditingProfile) {
                    profile?.let { currentProfile ->
                        EditProfileScreen(
                            profile = currentProfile,
                            isSaving = isSavingProfile,
                            saveError = saveProfileError,
                            onSave = { request: UpdateProfileRequest ->
                                isSavingProfile = true
                                saveProfileError = null

                                lifecycleScope.launch {
                                    try {
                                        profile = profileController.updateMyProfile(request)
                                        isEditingProfile = false
                                    } catch (exception: HttpException) {
                                        saveProfileError = when (exception.code()) {
                                            401 -> {
                                                logout()
                                                serverError =
                                                    "La sesion expiro. Inicia sesion nuevamente"
                                                null
                                            }
                                            409 -> "Ese correo ya esta en uso"
                                            400 -> "Revisa los datos ingresados"
                                            else -> "No se pudo actualizar el perfil"
                                        }
                                    } catch (exception: IOException) {
                                        saveProfileError = "No se pudo conectar con el servidor"
                                    } catch (exception: Exception) {
                                        saveProfileError = "Ocurrio un error inesperado"
                                    } finally {
                                        isSavingProfile = false
                                    }
                                }
                            },
                            onCancel = {
                                saveProfileError = null
                                isEditingProfile = false
                            },
                            onChangeEmail = {
                                saveProfileError = null
                                isEditingProfile = false
                                isChangingEmail = true
                                isEmailCodeSent = false
                                emailChangeError = null
                            }
                        )
                    }
                } else if (loggedUserName != null && isViewingProfile) {
                    ProfileScreen(
                        isLoading = isLoadingProfile,
                        errorMessage = profileError,
                        profile = profile,
                        onRetry = { loadProfile() },
                        onBack = {
                            isViewingProfile = false
                            profileError = null
                        },
                        onEdit = {
                            saveProfileError = null
                            isEditingProfile = true
                        }
                    )
                } else if (loggedUserName != null && selectedPetId != null && isViewingHistoria) {
                    HistoriaClinicaScreen(
                        isLoading = isLoadingHistoria,
                        errorMessage = historiaError,
                        eventos = historiaEventos,
                        isExporting = isExportingHistoria,
                        exportMessage = exportHistoriaMessage,
                        canExport = selectedPet != null,
                        onExportPdf = {
                            val pet = selectedPet ?: return@HistoriaClinicaScreen
                            val eventos = historiaEventos
                            isExportingHistoria = true
                            exportHistoriaMessage = null

                            lifecycleScope.launch {
                                try {
                                    val file = withContext(Dispatchers.IO) {
                                        HistoriaClinicaPdfGenerator.generate(
                                            context = applicationContext,
                                            pet = pet,
                                            eventos = eventos
                                        )
                                    }
                                    val saved = withContext(Dispatchers.IO) {
                                        ExportStorage.saveToDownloads(
                                            context = applicationContext,
                                            source = file,
                                            mimeType = "application/pdf"
                                        )
                                    }
                                    exportHistoriaMessage = if (saved) {
                                        "PDF guardado en Descargas"
                                    } else {
                                        "No se pudo guardar en Descargas, pero podes compartirlo"
                                    }
                                    startActivity(
                                        ExportStorage.buildShareIntent(
                                            this@MainActivity, file, "application/pdf"
                                        )
                                    )
                                } catch (exception: Exception) {
                                    exportHistoriaMessage = "No se pudo exportar el PDF"
                                } finally {
                                    isExportingHistoria = false
                                }
                            }
                        },
                        onExportArchivos = {
                            val eventos = historiaEventos
                            isExportingHistoria = true
                            exportHistoriaMessage = null

                            lifecycleScope.launch {
                                try {
                                    val files = MedicalFilesDownloader.downloadAll(
                                        context = applicationContext,
                                        eventos = eventos
                                    )
                                    if (files.isEmpty()) {
                                        exportHistoriaMessage =
                                            "No se pudieron descargar los archivos medicos"
                                    } else {
                                        withContext(Dispatchers.IO) {
                                            files.forEach { archivo ->
                                                val mime = URLConnection
                                                    .guessContentTypeFromName(archivo.name)
                                                    ?: "application/octet-stream"
                                                ExportStorage.saveToDownloads(
                                                    applicationContext, archivo, mime
                                                )
                                            }
                                        }
                                        exportHistoriaMessage =
                                            "Se exportaron ${files.size} archivo(s) a Descargas"
                                        startActivity(
                                            ExportStorage.buildShareMultipleIntent(
                                                this@MainActivity, files, "*/*"
                                            )
                                        )
                                    }
                                } catch (exception: Exception) {
                                    exportHistoriaMessage =
                                        "No se pudieron exportar los archivos medicos"
                                } finally {
                                    isExportingHistoria = false
                                }
                            }
                        },
                        onRetry = { selectedPetId?.let { loadHistoriaClinica(it) } },
                        onBack = {
                            isViewingHistoria = false
                            historiaError = null
                            historiaEventos = emptyList()
                            exportHistoriaMessage = null
                        }
                    )
                } else if (loggedUserName != null && selectedPetId != null) {
                    PetProfileScreen(
                        isLoading = isLoadingPetProfile,
                        errorMessage = petProfileError,
                        pet = selectedPet,
                        onRetry = { selectedPetId?.let { loadPetProfile(it) } },
                        onBack = {
                            selectedPetId = null
                            selectedPet = null
                            petProfileError = null
                        },
                        onViewHistoria = {
                            historiaError = null
                            historiaEventos = emptyList()
                            isViewingHistoria = true
                            selectedPetId?.let { loadHistoriaClinica(it) }
                        }
                    )
                } else if (loggedUserName != null && isViewingSettings) {
                    ConfiguracionScreen(
                        isDarkMode = isDarkMode,
                        onDarkModeChange = { enabled ->
                            darkModePreference = enabled
                            themePreferences.setDarkMode(enabled)
                        },
                        onBack = { isViewingSettings = false }
                    )
                } else if (loggedUserName != null && isViewingMisTurnos) {
                    MisTurnosScreen(
                        isLoading = isLoadingMisTurnos,
                        errorMessage = misTurnosError,
                        turnos = misTurnos,
                        onRetry = { loadMisTurnos() },
                        onBack = {
                            isViewingMisTurnos = false
                            misTurnosError = null
                        }
                    )
                } else if (loggedUserName != null && isRequestingTurno) {
                    SolicitarTurnoScreen(
                        pets = pets,
                        veterinarias = veterinariasTurno,
                        isLoadingVeterinarias = isLoadingVeterinariasTurno,
                        disponibilidades = disponibilidadesTurno,
                        isLoadingDisponibilidades = isLoadingDisponibilidadesTurno,
                        isSaving = isSavingTurno,
                        errorMessage = turnoError,
                        successMessage = turnoSuccess,
                        onSelectVeterinaria = { idVeterinario ->
                            turnoError = null
                            loadDisponibilidadesTurno(idVeterinario)
                        },
                        onSolicitar = { idMascota, idVeterinario, fecha, hora, motivoConsulta ->
                            isSavingTurno = true
                            turnoError = null

                            lifecycleScope.launch {
                                try {
                                    turnosController.solicitarTurno(
                                        CreateTurnoRequest(
                                            idMascota = idMascota,
                                            idVeterinario = idVeterinario,
                                            fecha = fecha,
                                            hora = hora,
                                            motivoConsulta = motivoConsulta
                                        )
                                    )
                                    turnoSuccess = "Tu turno quedó pendiente de confirmación"
                                } catch (exception: HttpException) {
                                    turnoError = when (exception.code()) {
                                        401 -> {
                                            logout()
                                            serverError =
                                                "La sesion expiro. Inicia sesion nuevamente"
                                            null
                                        }
                                        403 -> "No podés solicitar un turno para una mascota que no es tuya"
                                        404 -> "No se encontró la mascota o la veterinaria"
                                        else -> "El horario solicitado no está disponible"
                                    }
                                } catch (exception: IOException) {
                                    turnoError = "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    turnoError = "Ocurrio un error inesperado"
                                } finally {
                                    isSavingTurno = false
                                }
                            }
                        },
                        onBack = {
                            isRequestingTurno = false
                            turnoError = null
                            turnoSuccess = null
                        }
                    )
                } else if (loggedUserName != null) {
                    AuthenticatedHomeScreen(
                        userName = loggedUserName.orEmpty(),
                        pets = pets,
                        isLoadingPets = isLoadingPets,
                        petsError = petsError,
                        onRetryPets = { loadPets() },
                        onRegisterPet = {
                            savePetError = null
                            isRegisteringPet = true
                        },
                        onEditPet = { pet ->
                            updatePetError = null
                            editingPet = pet
                        },
                        onLogout = { logout() },
                        onPetClick = { pet ->
                            selectedPetId = pet.id
                            selectedPet = null
                            petProfileError = null
                            loadPetProfile(pet.id)
                        },
                        onProfileClick = {
                            profileError = null
                            isViewingProfile = true
                            loadProfile()
                        },
                        onPublishAdoption = {
                            adopcionError = null
                            adopcionSuccess = null
                            isPublishingAdopcion = true
                        },
                        onViewAdopciones = {
                            adopcionesListError = null
                            isViewingAdopciones = true
                            loadAdopciones()
                        },
                        onSettingsClick = { isViewingSettings = true },
                        onServiciosClick = {
                            saveServicioError = null
                            serviciosError = null
                            isViewingServicios = true
                            loadServicios()
                        },
                        onRequestTurno = {
                            turnoError = null
                            turnoSuccess = null
                            isRequestingTurno = true
                            loadVeterinariasTurno()
                        },
                        onViewMisTurnos = {
                            misTurnosError = null
                            isViewingMisTurnos = true
                            loadMisTurnos()
                        }
                    )
                } else if (isRegisteringUser) {
                    RegisterScreen(
                        isLoading = isRegisterLoading,
                        serverError = registerError,
                        successMessage = registerSuccessMessage,
                        onRegister = { nombre, apellido, email, password ->
                            isRegisterLoading = true
                            registerError = null

                            lifecycleScope.launch {
                                try {
                                    sessionController.register(
                                        nombre = nombre,
                                        apellido = apellido,
                                        email = email,
                                        password = password
                                    )

                                    registerSuccessMessage =
                                        "Cuenta creada correctamente. Ya podes iniciar sesion."
                                } catch (exception: HttpException) {
                                    registerError = when (exception.code()) {
                                        409 -> "Ese correo ya esta registrado"
                                        400 -> "Revisa los datos ingresados"
                                        500 -> "Ocurrio un error en el servidor"
                                        else -> "No se pudo completar el registro"
                                    }
                                } catch (exception: IOException) {
                                    registerError =
                                        "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    registerError =
                                        "Ocurrio un error inesperado"
                                } finally {
                                    isRegisterLoading = false
                                }
                            }
                        },
                        onNavigateToLogin = {
                            isRegisteringUser = false
                            registerError = null
                            registerSuccessMessage = null
                        }
                    )
                } else {
                    when (currentScreen) {
                        AuthScreen.LOGIN -> {
                            LoginScreen(
                                isLoading = isLoading,
                                serverError = serverError,
                                onLogin = { email, password ->
                                    isLoading = true
                                    serverError = null

                                    lifecycleScope.launch {
                                        try {
                                            val session = sessionController.login(
                                                email = email,
                                                password = password
                                            )

                                            loggedUserName = session.userName
                                            loadPets()
                                        } catch (exception: HttpException) {
                                            serverError = when (exception.code()) {
                                                400, 401 -> "Correo o contraseña incorrectos"
                                                404 -> "No se encontró el servicio de autenticación"
                                                500 -> "Ocurrió un error en el servidor"
                                                else -> "No se pudo iniciar sesión"
                                            }
                                        } catch (exception: IOException) {
                                            serverError =
                                                "No se pudo conectar con el servidor"
                                        } catch (exception: Exception) {
                                            serverError =
                                                "Ocurrió un error inesperado"
                                        } finally {
                                            isLoading = false
                                        }
                                    }
                                },
                                onForgotPassword = {
                                    currentScreen = AuthScreen.FORGOT_PASSWORD
                                    serverError = null
                                    forgotPasswordSuccess = null
                                },
                                onNavigateToRegister = {
                                    isRegisteringUser = true
                                    registerError = null
                                    registerSuccessMessage = null
                                }
                            )
                        }

                        AuthScreen.FORGOT_PASSWORD -> {
                            ForgotPasswordScreen(
                                isLoading = isLoading,
                                serverError = serverError,
                                successMessage = forgotPasswordSuccess,
                                onSendCode = { email ->
                                    isLoading = true
                                    serverError = null
                                    forgotPasswordSuccess = null

                                    lifecycleScope.launch {
                                        try {
                                            val response = RetrofitClient.authApi(sessionStore).forgotPassword(
                                                ForgotPasswordRequest(email = email)
                                            )
                                            forgotPasswordSuccess = response.mensaje
                                        } catch (exception: HttpException) {
                                            serverError = when (exception.code()) {
                                                400 -> "Error al enviar el código"
                                                500 -> "Ocurrió un error en el servidor"
                                                else -> "No se pudo enviar el código"
                                            }
                                        } catch (exception: IOException) {
                                            serverError =
                                                "No se pudo conectar con el servidor"
                                        } catch (exception: Exception) {
                                            serverError =
                                                "Ocurrió un error inesperado"
                                        } finally {
                                            isLoading = false
                                        }
                                    }
                                },
                                onNavigateToReset = { email ->
                                    resetEmail = email
                                    currentScreen = AuthScreen.RESET_PASSWORD
                                    serverError = null
                                    resetPasswordSuccess = null
                                },
                                onNavigateToLogin = {
                                    currentScreen = AuthScreen.LOGIN
                                    serverError = null
                                    forgotPasswordSuccess = null
                                }
                            )
                        }

                        AuthScreen.RESET_PASSWORD -> {
                            ResetPasswordScreen(
                                email = resetEmail,
                                isLoading = isLoading,
                                serverError = serverError,
                                successMessage = resetPasswordSuccess,
                                onResetPassword = { codigo, nuevaContrasena ->
                                    isLoading = true
                                    serverError = null
                                    resetPasswordSuccess = null

                                    lifecycleScope.launch {
                                        try {
                                            val response = RetrofitClient.authApi(sessionStore).resetPassword(
                                                ResetPasswordRequest(
                                                    email = resetEmail,
                                                    codigo = codigo,
                                                    nuevaContrasena = nuevaContrasena
                                                )
                                            )
                                            resetPasswordSuccess = response.mensaje
                                        } catch (exception: HttpException) {
                                            serverError = when (exception.code()) {
                                                400 -> "Código o contraseña inválidos"
                                                500 -> "Ocurrió un error en el servidor"
                                                else -> "No se pudo restablecer la contraseña"
                                            }
                                        } catch (exception: IOException) {
                                            serverError =
                                                "No se pudo conectar con el servidor"
                                        } catch (exception: Exception) {
                                            serverError =
                                                "Ocurrió un error inesperado"
                                        } finally {
                                            isLoading = false
                                        }
                                    }
                                },
                                onNavigateToLogin = {
                                    currentScreen = AuthScreen.LOGIN
                                    serverError = null
                                    resetPasswordSuccess = null
                                    resetEmail = ""
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    private suspend fun createPet(
        petsController: PetsController,
        request: CreatePetRequest,
        photoUri: Uri?
    ): PetResponse =
        if (photoUri == null) {
            petsController.createPet(request)
        } else {
            petsController.createPetWithPhoto(
                request = request,
                photo = buildPhotoPart(photoUri)
            )
        }

    private suspend fun updatePet(
        petsController: PetsController,
        id: Int,
        request: UpdatePetRequest,
        photoUri: Uri?
    ): PetResponse =
        if (photoUri == null) {
            petsController.updatePet(id, request)
        } else {
            petsController.updatePetWithPhoto(
                id = id,
                request = request,
                photo = buildPhotoPart(photoUri)
            )
        }

    private fun buildPhotoPart(photoUri: Uri): MultipartBody.Part {
        val contentResolver = applicationContext.contentResolver
        val mimeType = contentResolver.getType(photoUri) ?: "image/jpeg"
        val fileName = getDisplayName(photoUri) ?: "mascota.jpg"
        val bytes = contentResolver.openInputStream(photoUri)?.use { input ->
            input.readBytes()
        } ?: throw IOException("No se pudo leer la foto seleccionada")

        return MultipartBody.Part.createFormData(
            name = "foto",
            filename = fileName,
            body = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
        )
    }

    private fun getDisplayName(photoUri: Uri): String? {
        val contentResolver = applicationContext.contentResolver
        return contentResolver.query(photoUri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (nameIndex >= 0 && cursor.moveToFirst()) {
                cursor.getString(nameIndex)
            } else {
                null
            }
        }
    }
}
