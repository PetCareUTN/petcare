package com.petcare.app.features.auth.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.petcare.app.features.auth.domain.LoginValidator
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun LoginScreen(
    isLoading: Boolean = false,
    isGoogleLoading: Boolean = false,
    serverError: String? = null,
    onLogin: (email: String, password: String) -> Unit,
    onGoogleSignIn: () -> Unit = {},
    onForgotPassword: () -> Unit = {},
    onNavigateToRegister: () -> Unit = {}
) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var emailError by rememberSaveable { mutableStateOf<String?>(null) }
    var passwordError by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.Start
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = MaterialTheme.shapes.large,
                    color = PetCareTeal
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "PC",
                            color = Color.White,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
                Column {
                    Text(
                        text = "PetCare",
                        style = MaterialTheme.typography.titleLarge
                    )
                    Text(
                        text = "Cuidado conectado",
                        color = PetCareMuted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(40.dp))

            Text(
                text = "Hola,",
                style = MaterialTheme.typography.headlineLarge
            )

            Text(
                text = "inicie sesión para continuar",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyLarge
            )

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = BorderStroke(1.dp, PetCareLine),
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            emailError = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Correo electrónico") },
                        singleLine = true,
                        enabled = !isLoading,
                        isError = emailError != null,
                        supportingText = {
                            emailError?.let { Text(it) }
                        },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        )
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            passwordError = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Contraseña") },
                        singleLine = true,
                        enabled = !isLoading,
                        isError = passwordError != null,
                        supportingText = {
                            passwordError?.let { Text(it) }
                        },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        )
                    )

                    serverError?.let {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = PetCareTealSoft,
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Text(
                                text = it,
                                color = MaterialTheme.colorScheme.error,
                                modifier = Modifier.padding(12.dp),
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }

                    Button(
                        onClick = {
                            emailError = LoginValidator.validateEmail(email)
                            passwordError = LoginValidator.validatePassword(password)

                            if (emailError == null && passwordError == null) {
                                onLogin(email.trim(), password)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        enabled = !isLoading,
                        shape = MaterialTheme.shapes.large
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("Iniciar sesión")
                        }
                    }

                    SeparadorO(modifier = Modifier.padding(vertical = 4.dp))

                    BotonGoogle(
                        texto = "Continuar con Google",
                        isLoading = isGoogleLoading,
                        enabled = !isLoading,
                        onClick = onGoogleSignIn
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "¿No tienes cuenta?",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
                TextButton(onClick = onNavigateToRegister) {
                    Text("Registrarse")
                }
            }
        }

        TextButton(
            onClick = onForgotPassword,
            modifier = Modifier.padding(top = 16.dp)
        ) {
            Text("Olvidé mi contraseña / activar cuenta?")
        }
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = PetCareMint,
            shape = MaterialTheme.shapes.extraLarge
        ) {
            Text(
                text = "Gestiona mascotas, turnos e historial desde un solo lugar.",
                modifier = Modifier.padding(16.dp),
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
