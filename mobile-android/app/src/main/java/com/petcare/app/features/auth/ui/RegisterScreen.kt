package com.petcare.app.features.auth.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.petcare.app.R
import com.petcare.app.features.auth.domain.RegisterValidator
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

// Mismo verde con el que esta pintado el logo, para que el titulo lo acompane.
private val VerdeLogo = Color(0xFF3D6B64)

/**
 * Etiqueta fija arriba del campo, como en el login. Se usa en lugar de la
 * etiqueta flotante de Material para que las dos pantallas se vean iguales.
 */
@Composable
private fun EtiquetaCampo(texto: String) {
    Text(
        text = texto,
        style = MaterialTheme.typography.labelLarge,
        modifier = Modifier.padding(bottom = 6.dp)
    )
}

@Composable
private fun coloresCampo() = OutlinedTextFieldDefaults.colors(
    unfocusedBorderColor = PetCareLine,
    focusedBorderColor = PetCareTeal
)

@Composable
fun RegisterScreen(
    isLoading: Boolean = false,
    isGoogleLoading: Boolean = false,
    serverError: String? = null,
    successMessage: String? = null,
    onGoogleSignIn: () -> Unit = {},
    onRegister: (
        nombre: String,
        apellido: String,
        dni: String,
        email: String,
        password: String
    ) -> Unit,
    onNavigateToLogin: () -> Unit
) {
    var nombre by rememberSaveable { mutableStateOf("") }
    var apellido by rememberSaveable { mutableStateOf("") }
    var dni by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var nombreError by rememberSaveable { mutableStateOf<String?>(null) }
    var apellidoError by rememberSaveable { mutableStateOf<String?>(null) }
    var dniError by rememberSaveable { mutableStateOf<String?>(null) }
    var emailError by rememberSaveable { mutableStateOf<String?>(null) }
    var passwordError by rememberSaveable { mutableStateOf<String?>(null) }
    var confirmPasswordError by rememberSaveable { mutableStateOf<String?>(null) }
    var mostrarPassword by rememberSaveable { mutableStateOf(false) }
    var mostrarConfirmPassword by rememberSaveable { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .systemBarsPadding()
            .padding(horizontal = 26.dp)
    ) {
        // Vuelta al login: se llega acá desde ahí, tiene que haber salida.
        IconButton(
            onClick = onNavigateToLogin,
            modifier = Modifier.padding(top = 4.dp)
        ) {
            Icon(
                painter = painterResource(R.drawable.ic_arrow_back),
                contentDescription = "Volver",
                tint = VerdeLogo
            )
        }

        // Misma cabecera que el login: el logo en verde sobre el fondo, sin bandas.
        Box(
            modifier = Modifier.fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(R.drawable.logo_petcare_verde),
                contentDescription = "PetCare",
                modifier = Modifier
                    .width(150.dp)
                    .padding(vertical = 4.dp)
            )
        }

        Text(
            text = "Creá tu cuenta",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = VerdeLogo,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center
        )

        Text(
            text = "Registrate para empezar a cuidar a tu mascota",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(20.dp))

        if (successMessage != null) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = PetCareTealSoft,
                shape = RoundedCornerShape(12.dp)
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
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PetCareTealDark
                        )
                    ) {
                        Text("Iniciar sesión", fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            EtiquetaCampo("Nombre")
            OutlinedTextField(
                value = nombre,
                onValueChange = {
                    nombre = it
                    nombreError = null
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Tu nombre", color = PetCareMuted) },
                singleLine = true,
                enabled = !isLoading,
                isError = nombreError != null,
                // null cuando no hay error: si no, el campo reserva el espacio igual.
                supportingText = nombreError?.let { mensaje -> { Text(mensaje) } },
                shape = RoundedCornerShape(12.dp),
                colors = coloresCampo(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
            )

            Spacer(modifier = Modifier.height(14.dp))

            EtiquetaCampo("Apellido")
            OutlinedTextField(
                value = apellido,
                onValueChange = {
                    apellido = it
                    apellidoError = null
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Tu apellido", color = PetCareMuted) },
                singleLine = true,
                enabled = !isLoading,
                isError = apellidoError != null,
                supportingText = apellidoError?.let { mensaje -> { Text(mensaje) } },
                shape = RoundedCornerShape(12.dp),
                colors = coloresCampo(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
            )

            Spacer(modifier = Modifier.height(14.dp))

            EtiquetaCampo("DNI")
            OutlinedTextField(
                value = dni,
                onValueChange = {
                    dni = it.filter { character -> character.isDigit() }.take(8)
                    dniError = null
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Sin puntos ni espacios", color = PetCareMuted) },
                singleLine = true,
                enabled = !isLoading,
                isError = dniError != null,
                supportingText = dniError?.let { mensaje -> { Text(mensaje) } },
                shape = RoundedCornerShape(12.dp),
                colors = coloresCampo(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Next
                )
            )

            Spacer(modifier = Modifier.height(14.dp))

            EtiquetaCampo("Correo electrónico")
            OutlinedTextField(
                value = email,
                onValueChange = {
                    email = it
                    emailError = null
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("tu@correo.com", color = PetCareMuted) },
                singleLine = true,
                enabled = !isLoading,
                isError = emailError != null,
                supportingText = emailError?.let { mensaje -> { Text(mensaje) } },
                shape = RoundedCornerShape(12.dp),
                colors = coloresCampo(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                )
            )

            Spacer(modifier = Modifier.height(14.dp))

            EtiquetaCampo("Contraseña")
            OutlinedTextField(
                value = password,
                onValueChange = {
                    password = it
                    passwordError = null
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Al menos 8 caracteres", color = PetCareMuted) },
                singleLine = true,
                enabled = !isLoading,
                isError = passwordError != null,
                supportingText = passwordError?.let { mensaje -> { Text(mensaje) } },
                shape = RoundedCornerShape(12.dp),
                colors = coloresCampo(),
                visualTransformation = if (mostrarPassword) {
                    VisualTransformation.None
                } else {
                    PasswordVisualTransformation()
                },
                trailingIcon = {
                    OjoContrasena(
                        visible = mostrarPassword,
                        onToggle = { mostrarPassword = !mostrarPassword }
                    )
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Next
                )
            )

            Spacer(modifier = Modifier.height(14.dp))

            EtiquetaCampo("Confirmar contraseña")
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = {
                    confirmPassword = it
                    confirmPasswordError = null
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Repetí tu contraseña", color = PetCareMuted) },
                singleLine = true,
                enabled = !isLoading,
                isError = confirmPasswordError != null,
                supportingText = confirmPasswordError?.let { mensaje -> { Text(mensaje) } },
                shape = RoundedCornerShape(12.dp),
                colors = coloresCampo(),
                visualTransformation = if (mostrarConfirmPassword) {
                    VisualTransformation.None
                } else {
                    PasswordVisualTransformation()
                },
                trailingIcon = {
                    OjoContrasena(
                        visible = mostrarConfirmPassword,
                        onToggle = { mostrarConfirmPassword = !mostrarConfirmPassword }
                    )
                },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done
                )
            )

            serverError?.let {
                Spacer(modifier = Modifier.height(12.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = PetCareTealSoft,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = {
                    nombreError = RegisterValidator.validateNombre(nombre)
                    apellidoError = RegisterValidator.validateApellido(apellido)
                    dniError = RegisterValidator.validateDni(dni)
                    emailError = RegisterValidator.validateEmail(email)
                    passwordError = RegisterValidator.validatePassword(password)
                    confirmPasswordError = RegisterValidator.validateConfirmPassword(
                        password = password,
                        confirmPassword = confirmPassword
                    )

                    val hasErrors = listOf(
                        nombreError,
                        apellidoError,
                        dniError,
                        emailError,
                        passwordError,
                        confirmPasswordError
                    ).any { it != null }

                    if (!hasErrors) {
                        onRegister(
                            nombre.trim(),
                            apellido.trim(),
                            dni.trim(),
                            email.trim(),
                            password
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = !isLoading,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PetCareTealDark)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(
                        text = "Registrarme",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            }

            SeparadorO(
                modifier = Modifier.padding(vertical = 16.dp),
                texto = "o continuá con"
            )

            BotonGoogle(
                texto = "Continuar con Google",
                isLoading = isGoogleLoading,
                enabled = !isLoading,
                onClick = onGoogleSignIn
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "¿Ya tenés cuenta?",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
                TextButton(onClick = onNavigateToLogin) {
                    Text(
                        text = "Iniciar sesión",
                        color = PetCareTealDark,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}
