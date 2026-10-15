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
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.petcare.app.R
import com.petcare.app.features.auth.domain.LoginValidator
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
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
    var mostrarPassword by rememberSaveable { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            // Deja libres la barra de estado y la de navegación del sistema.
            .systemBarsPadding(),
        // Centrado cuando sobra lugar; si no entra (teclado abierto), scrollea.
        verticalArrangement = Arrangement.Center
    ) {
        Column(modifier = Modifier.padding(horizontal = 26.dp)) {
            /*
             * El logo va en verde sobre el mismo fondo de la pantalla: sin
             * bloques de color, para que no haya cortes bruscos entre secciones.
             */
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(R.drawable.logo_petcare_verde),
                    contentDescription = "PetCare",
                    modifier = Modifier
                        .width(150.dp)
                        // El archivo trae aire propio arriba y abajo.
                        .padding(vertical = 4.dp)
                )
            }

            Text(
                text = "Iniciá sesión para continuar",
                color = PetCareMuted,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Correo electrónico",
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(bottom = 6.dp)
            )
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
                // null cuando no hay error: si no, el campo reserva el espacio igual.
                supportingText = emailError?.let { mensaje -> { Text(mensaje) } },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = PetCareLine,
                    focusedBorderColor = PetCareTeal
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                )
            )

            Spacer(modifier = Modifier.height(14.dp))

            Text(
                text = "Contraseña",
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(bottom = 6.dp)
            )
            OutlinedTextField(
                value = password,
                onValueChange = {
                    password = it
                    passwordError = null
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Tu contraseña", color = PetCareMuted) },
                singleLine = true,
                enabled = !isLoading,
                isError = passwordError != null,
                supportingText = passwordError?.let { mensaje -> { Text(mensaje) } },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = PetCareLine,
                    focusedBorderColor = PetCareTeal
                ),
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
                    imeAction = ImeAction.Done
                )
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(onClick = onForgotPassword) {
                    Text(
                        text = "¿Olvidaste tu contraseña?",
                        color = PetCareTealDark,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.5.sp
                    )
                }
            }

            serverError?.let {
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
                Spacer(modifier = Modifier.height(12.dp))
            }

            Spacer(modifier = Modifier.height(6.dp))

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
                        text = "Iniciar sesión",
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
                    text = "¿No tenés cuenta?",
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
                TextButton(onClick = onNavigateToRegister) {
                    Text(
                        text = "Registrarme",
                        color = PetCareTealDark,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
