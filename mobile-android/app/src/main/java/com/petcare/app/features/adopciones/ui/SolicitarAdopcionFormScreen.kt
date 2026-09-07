package com.petcare.app.features.adopciones.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark
import com.petcare.app.ui.theme.PetCareTealSoft

@Composable
fun SolicitarAdopcionFormScreen(
    nombreMascota: String,
    isSending: Boolean,
    errorMessage: String?,
    onEnviar: (
        tipoVivienda: String?,
        tienePatio: Boolean?,
        tieneOtrasMascotas: Boolean?,
        tieneNinos: Boolean?,
        tuvoMascotasAntes: Boolean?,
        motivo: String,
        informacionAdicional: String?
    ) -> Unit,
    onBack: () -> Unit
) {
    var tipoVivienda by rememberSaveable { mutableStateOf<String?>(null) }
    var tienePatio by rememberSaveable { mutableStateOf<Boolean?>(null) }
    var tieneOtrasMascotas by rememberSaveable { mutableStateOf<Boolean?>(null) }
    var tieneNinos by rememberSaveable { mutableStateOf<Boolean?>(null) }
    var tuvoMascotasAntes by rememberSaveable { mutableStateOf<Boolean?>(null) }
    var motivo by rememberSaveable { mutableStateOf("") }
    var informacionAdicional by rememberSaveable { mutableStateOf("") }
    var formError by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.Top,
        horizontalAlignment = Alignment.Start
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, enabled = !isSending) {
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_back),
                    contentDescription = "Volver",
                    tint = PetCareTealDark
                )
            }
            Text(text = "Solicitar adopción", style = MaterialTheme.typography.headlineSmall)
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = "Contanos un poco sobre vos para que el responsable de $nombreMascota pueda conocerte.",
            color = PetCareMuted,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(start = 4.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))

        Pregunta("¿Dónde vivís?")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Opcion("Casa", tipoVivienda == "CASA", Modifier.weight(1f)) { tipoVivienda = "CASA" }
            Opcion("Departamento", tipoVivienda == "DEPARTAMENTO", Modifier.weight(1f)) { tipoVivienda = "DEPARTAMENTO" }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Pregunta("¿Tenés patio?")
        OpcionSiNo(tienePatio) { tienePatio = it }

        Spacer(modifier = Modifier.height(16.dp))
        Pregunta("¿Tenés otras mascotas?")
        OpcionSiNo(tieneOtrasMascotas) { tieneOtrasMascotas = it }

        Spacer(modifier = Modifier.height(16.dp))
        Pregunta("¿Tenés niños?")
        OpcionSiNo(tieneNinos) { tieneNinos = it }

        Spacer(modifier = Modifier.height(16.dp))
        Pregunta("¿Tuviste mascotas anteriormente?")
        OpcionSiNo(tuvoMascotasAntes) { tuvoMascotasAntes = it }

        Spacer(modifier = Modifier.height(16.dp))
        Pregunta("¿Por qué querés adoptar esta mascota?")
        OutlinedTextField(
            value = motivo,
            onValueChange = { motivo = it; formError = null },
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            enabled = !isSending,
            singleLine = false
        )

        Spacer(modifier = Modifier.height(16.dp))
        Pregunta("Información adicional (opcional)")
        OutlinedTextField(
            value = informacionAdicional,
            onValueChange = { informacionAdicional = it },
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp),
            enabled = !isSending,
            singleLine = false
        )

        val error = formError ?: errorMessage
        if (error != null) {
            Spacer(modifier = Modifier.height(14.dp))
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = PetCareTealSoft,
                shape = MaterialTheme.shapes.medium
            ) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = {
                if (motivo.isBlank()) {
                    formError = "Contanos por qué querés adoptarla"
                } else {
                    onEnviar(
                        tipoVivienda,
                        tienePatio,
                        tieneOtrasMascotas,
                        tieneNinos,
                        tuvoMascotasAntes,
                        motivo.trim(),
                        informacionAdicional.trim().ifBlank { null }
                    )
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            enabled = !isSending,
            shape = MaterialTheme.shapes.large
        ) {
            if (isSending) {
                CircularProgressIndicator(
                    modifier = Modifier.height(22.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("ENVIAR SOLICITUD")
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        TextButton(
            onClick = onBack,
            enabled = !isSending,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancelar")
        }
    }
}

@Composable
private fun Pregunta(texto: String) {
    Text(
        text = texto,
        style = MaterialTheme.typography.titleSmall,
        modifier = Modifier.padding(bottom = 8.dp)
    )
}

@Composable
private fun OpcionSiNo(valor: Boolean?, onChange: (Boolean) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Opcion("Sí", valor == true, Modifier.weight(1f)) { onChange(true) }
        Opcion("No", valor == false, Modifier.weight(1f)) { onChange(false) }
    }
}

@Composable
private fun Opcion(
    texto: String,
    seleccionado: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        color = if (seleccionado) PetCareTeal else MaterialTheme.colorScheme.surface,
        shape = MaterialTheme.shapes.large,
        border = BorderStroke(1.dp, if (seleccionado) PetCareTeal else PetCareLine)
    ) {
        Text(
            text = texto,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            textAlign = TextAlign.Center,
            color = if (seleccionado) androidx.compose.ui.graphics.Color.White else PetCareTealDark,
            style = MaterialTheme.typography.labelLarge
        )
    }
}
