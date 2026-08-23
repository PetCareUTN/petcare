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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import com.petcare.app.features.auth.domain.RegisterValidator
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMint
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun RegisterScreen(
    isLoading: Boolean = false,
    serverError: String? = null,
    successMessage: String? = null,
    onRegister: (nombre: String, apellido: String, email: String, password: String) -> Unit,
    onNavigateToLogin: () -> Unit
) {
    var nombre by rememberSaveable { mutableStateOf("") }
    var apellido by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var nombreError by rememberSaveable { mutableStateOf<String?>(null) }
    var apellidoError by rememberSaveable { mutableStateOf<String?>(null) }
    var emailError by rememberSaveable { mutableStateOf<String?>(null) }
    var passwordError by rememberSaveable { mutableStateOf<String?>(null) }
    var confirmPasswordError by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
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
            text = "Creá tu cuenta",
            style = MaterialTheme.typography.headlineLarge
        )

        Text(
            text = "Registrate para empezar a cuidar a tu mascota",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyLarge
        )

        if (successMessage != null) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp),
                color = PetCareTealSoft,
                shape = MaterialTheme.shapes.extraLarge
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = successMessage,
                        color = PetCareTealDark,
                        style = MaterialTheme.typography.bodyMedium
                    )

                    Button(
                        onClick = onNavigateToLogin,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = MaterialTheme.shapes.large
                    ) {
                        Text("Iniciar sesion")
                    }
                }
            }
        } else {
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
                        value = nombre,
                        onValueChange = {
                            nombre = it
                            nombreError = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Nombre") },
                        singleLine = true,
                        enabled = !isLoading,
                        isError = nombreError != null,
                        supportingText = {
                            nombreError?.let { Text(it) }
                        },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                    )

                    OutlinedTextField(
                        value = apellido,
                        onValueChange = {
                            apellido = it
                            apellidoError = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Apellido") },
                        singleLine = true,
                        enabled = !isLoading,
                        isError = apellidoError != null,
                        supportingText = {
                            apellidoError?.let { Text(it) }
                        },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                    )

                    OutlinedTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            emailError = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Correo electronico") },
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
                        label = { Text("Contrasena") },
                        singleLine = true,
                        enabled = !isLoading,
                        isError = passwordError != null,
                        supportingText = {
                            passwordError?.let { Text(it) }
                        },
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Next
                        )
                    )

                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = {
                            confirmPassword = it
                            confirmPasswordError = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Confirmar contrasena") },
                        singleLine = true,
                        enabled = !isLoading,
                        isError = confirmPasswordError != null,
                        supportingText = {
                            confirmPasswordError?.let { Text(it) }
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
                            nombreError = RegisterValidator.validateNombre(nombre)
                            apellidoError = RegisterValidator.validateApellido(apellido)
                            emailError = RegisterValidator.validateEmail(email)
                            passwordError = RegisterValidator.validatePassword(password)
                            confirmPasswordError = RegisterValidator.validateConfirmPassword(
                                password = password,
                                confirmPassword = confirmPassword
                            )

                            val hasErrors = listOf(
                                nombreError,
                                apellidoError,
                                emailError,
                                passwordError,
                                confirmPasswordError
                            ).any { it != null }

                            if (!hasErrors) {
                                onRegister(
                                    nombre.trim(),
                                    apellido.trim(),
                                    email.trim(),
                                    password
                                )
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
                            Text("Registrarme")
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        if (successMessage == null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "¿Ya tenes cuenta?",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
                TextButton(onClick = onNavigateToLogin) {
                    Text("Iniciar sesion")
                }
            }

            Spacer(modifier = Modifier.height(18.dp))
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
