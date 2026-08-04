package com.petcare.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
import com.petcare.app.ui.theme.PetCareTheme
import java.io.IOException
import kotlinx.coroutines.launch
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
                val sessionController = remember {
                    AuthSessionController(
                        authApi = RetrofitClient.authApi,
                        sessionStore = SessionManager(applicationContext)
                    )
                }
                var isLoading by rememberSaveable {
                    mutableStateOf(false)
                }
                var isRestoringSession by rememberSaveable {
                    mutableStateOf(true)
                }
                var serverError by rememberSaveable {
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

                LaunchedEffect(Unit) {
                    loggedUserName = sessionController.restoreSession()?.userName
                    isRestoringSession = false
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
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "¡Bienvenido, $loggedUserName!",
                            style = MaterialTheme.typography.headlineMedium
                        )
                    }
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
}
