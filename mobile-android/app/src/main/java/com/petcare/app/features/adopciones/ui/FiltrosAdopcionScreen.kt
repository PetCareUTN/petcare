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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import com.petcare.app.features.adopciones.data.remote.FiltrosAdopcion
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTeal
import com.petcare.app.ui.theme.PetCareTealDark

private val ESPECIES = listOf("Perro", "Gato", "Otro")
private val TAMANOS = listOf("PEQUENO" to "Pequeño", "MEDIANO" to "Mediano", "GRANDE" to "Grande")
private val SEXOS = listOf("macho" to "Macho", "hembra" to "Hembra")

@Composable
fun FiltrosAdopcionScreen(
    filtrosActuales: FiltrosAdopcion,
    onAplicar: (FiltrosAdopcion) -> Unit,
    onBack: () -> Unit
) {
    var especie by rememberSaveable { mutableStateOf(filtrosActuales.especie) }
    var tamano by rememberSaveable { mutableStateOf(filtrosActuales.tamano) }
    var sexo by rememberSaveable { mutableStateOf(filtrosActuales.sexo) }
    var esterilizado by rememberSaveable { mutableStateOf(filtrosActuales.esterilizado ?: false) }
    var vacunado by rememberSaveable { mutableStateOf(filtrosActuales.vacunado ?: false) }
    var compatiblePerros by rememberSaveable { mutableStateOf(filtrosActuales.compatiblePerros ?: false) }
    var compatibleGatos by rememberSaveable { mutableStateOf(filtrosActuales.compatibleGatos ?: false) }
    var compatibleNinos by rememberSaveable { mutableStateOf(filtrosActuales.compatibleNinos ?: false) }
    var necesitaPatio by rememberSaveable { mutableStateOf(filtrosActuales.necesitaPatio ?: false) }

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
            IconButton(onClick = onBack) {
                Icon(
                    painter = painterResource(R.drawable.ic_arrow_back),
                    contentDescription = "Volver",
                    tint = PetCareTealDark
                )
            }
            Text(text = "Filtros", style = MaterialTheme.typography.headlineSmall)
        }

        Spacer(modifier = Modifier.height(16.dp))

        SeccionTitulo("Especie")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ESPECIES.forEach { valor ->
                Chip(
                    texto = valor,
                    seleccionado = especie == valor,
                    modifier = Modifier.weight(1f)
                ) { especie = if (especie == valor) null else valor }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        SeccionTitulo("Tamaño")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TAMANOS.forEach { (valor, etiqueta) ->
                Chip(
                    texto = etiqueta,
                    seleccionado = tamano == valor,
                    modifier = Modifier.weight(1f)
                ) { tamano = if (tamano == valor) null else valor }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        SeccionTitulo("Sexo")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SEXOS.forEach { (valor, etiqueta) ->
                Chip(
                    texto = etiqueta,
                    seleccionado = sexo == valor,
                    modifier = Modifier.weight(1f)
                ) { sexo = if (sexo == valor) null else valor }
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        SeccionTitulo("Características")
        OpcionCheckbox("Castrado/a", esterilizado) { esterilizado = it }
        OpcionCheckbox("Vacunado/a", vacunado) { vacunado = it }
        OpcionCheckbox("Compatible con perros", compatiblePerros) { compatiblePerros = it }
        OpcionCheckbox("Compatible con gatos", compatibleGatos) { compatibleGatos = it }
        OpcionCheckbox("Compatible con niños", compatibleNinos) { compatibleNinos = it }
        OpcionCheckbox("Necesita patio", necesitaPatio) { necesitaPatio = it }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                onAplicar(
                    FiltrosAdopcion(
                        especie = especie,
                        tamano = tamano,
                        sexo = sexo,
                        esterilizado = esterilizado.takeIf { it },
                        vacunado = vacunado.takeIf { it },
                        compatiblePerros = compatiblePerros.takeIf { it },
                        compatibleGatos = compatibleGatos.takeIf { it },
                        compatibleNinos = compatibleNinos.takeIf { it },
                        necesitaPatio = necesitaPatio.takeIf { it }
                    )
                )
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.large
        ) {
            Text("Aplicar filtros")
        }

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedButton(
            onClick = { onAplicar(FiltrosAdopcion()) },
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large
        ) {
            Text("Limpiar filtros")
        }
    }
}

@Composable
private fun SeccionTitulo(texto: String) {
    Text(
        text = texto,
        style = MaterialTheme.typography.titleSmall,
        modifier = Modifier.padding(bottom = 8.dp)
    )
}

@Composable
private fun OpcionCheckbox(texto: String, valor: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onChange(!valor) },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(checked = valor, onCheckedChange = onChange)
        Text(text = texto, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun Chip(
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
