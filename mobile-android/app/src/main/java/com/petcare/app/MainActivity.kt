package com.petcare.app

import android.os.Bundle
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
import com.petcare.app.features.auth.data.remote.RetrofitClient
import com.petcare.app.features.auth.domain.AuthSessionController
import com.petcare.app.features.auth.ui.AuthenticatedHomeScreen
import com.petcare.app.features.auth.ui.LoginScreen
import com.petcare.app.features.pets.data.remote.PetResponse
import com.petcare.app.features.pets.domain.PetsController
import com.petcare.app.ui.theme.PetCareTheme
import java.io.IOException
import kotlinx.coroutines.launch
import retrofit2.HttpException

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
                var isLoading by rememberSaveable {
                    mutableStateOf(false)
                }
                var isLoadingPets by rememberSaveable {
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
                var loggedUserName by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var pets by remember {
                    mutableStateOf<List<PetResponse>>(emptyList())
                }

                fun logout() {
                    sessionController.logout()
                    loggedUserName = null
                    pets = emptyList()
                    serverError = null
                    petsError = null
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
                } else if (loggedUserName != null) {
                    AuthenticatedHomeScreen(
                        userName = loggedUserName.orEmpty(),
                        pets = pets,
                        isLoadingPets = isLoadingPets,
                        petsError = petsError,
                        onRetryPets = { loadPets() },
                        onLogout = { logout() }
                    )
                } else {
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
                        }
                    )
                }
            }
        }
    }
}
