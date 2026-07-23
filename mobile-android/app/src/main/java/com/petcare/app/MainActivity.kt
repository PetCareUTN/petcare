package com.petcare.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import com.petcare.app.features.auth.data.remote.LoginRequest
import com.petcare.app.features.auth.data.remote.RetrofitClient
import com.petcare.app.features.auth.ui.LoginScreen
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
                var isLoading by rememberSaveable {
                    mutableStateOf(false)
                }
                var serverError by rememberSaveable {
                    mutableStateOf<String?>(null)
                }
                var loggedUserName by rememberSaveable {
                    mutableStateOf<String?>(null)
                }

                if (loggedUserName != null) {
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
                    LoginScreen(
                        isLoading = isLoading,
                        serverError = serverError,
                        onLogin = { email, password ->
                            isLoading = true
                            serverError = null

                            lifecycleScope.launch {
                                try {
                                    val response = RetrofitClient.authApi.login(
                                        LoginRequest(
                                            email = email,
                                            password = password
                                        )
                                    )

                                    loggedUserName = response.usuario.nombre
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
                        }
                    )
                }
            }
        }
    }
}