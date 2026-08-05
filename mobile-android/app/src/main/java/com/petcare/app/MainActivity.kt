package com.petcare.app

import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
import com.petcare.app.features.auth.data.local.SessionManager
import com.petcare.app.features.auth.data.remote.ForgotPasswordRequest
import com.petcare.app.features.auth.data.remote.ResetPasswordRequest
import com.petcare.app.features.auth.data.remote.RetrofitClient
import com.petcare.app.features.auth.domain.AuthSessionController
import com.petcare.app.features.auth.ui.ForgotPasswordScreen
import com.petcare.app.features.auth.ui.LoginScreen
import com.petcare.app.features.auth.ui.ResetPasswordScreen
import com.petcare.app.features.auth.ui.AuthenticatedHomeScreen
import com.petcare.app.features.auth.ui.LoginScreen
import com.petcare.app.features.auth.ui.RegisterScreen
import com.petcare.app.features.historiaclinica.data.remote.EventoClinicoResponse
import com.petcare.app.features.historiaclinica.domain.HistoriaClinicaController
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
import com.petcare.app.features.profile.ui.EditProfileScreen
import com.petcare.app.features.profile.ui.ProfileScreen
import com.petcare.app.ui.theme.PetCareTheme
import java.io.IOException
import kotlinx.coroutines.launch
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
            PetCareTheme {
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
                        onRetry = { selectedPetId?.let { loadHistoriaClinica(it) } },
                        onBack = {
                            isViewingHistoria = false
                            historiaError = null
                            historiaEventos = emptyList()
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
                                }
                            )
                                    loggedUserName = session.userName
                                    loadPets()
                                } catch (exception: HttpException) {
                                    serverError = when (exception.code()) {
                                        400, 401 -> "Correo o contrasena incorrectos"
                                        404 -> "No se encontro el servicio de autenticacion"
                                        500 -> "Ocurrio un error en el servidor"
                                        else -> "No se pudo iniciar sesion"
                                    }
                                } catch (exception: IOException) {
                                    serverError =
                                        "No se pudo conectar con el servidor"
                                } catch (exception: Exception) {
                                    serverError =
                                        "Ocurrio un error inesperado"
                                } finally {
                                    isLoading = false
                                }
                            }
                        },
                        onNavigateToRegister = {
                            isRegisteringUser = true
                            registerError = null
                            registerSuccessMessage = null
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
                                            val response = RetrofitClient.authApi.forgotPassword(
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
                                            val response = RetrofitClient.authApi.resetPassword(
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
