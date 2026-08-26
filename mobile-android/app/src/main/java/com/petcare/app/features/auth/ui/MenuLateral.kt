package com.petcare.app.features.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.petcare.app.R
import com.petcare.app.ui.theme.PetCareLine
import com.petcare.app.ui.theme.PetCareMuted
import com.petcare.app.ui.theme.PetCareTealDark

/**
 * Menu lateral compartido por las secciones principales (Inicio, Servicios,
 * Adopcion, Turnos), asi el acceso a "Nuevo turno", "Publicar en adopcion",
 * etc. esta disponible sin importar en que seccion este el usuario.
 */
@Composable
fun MenuLateral(
    userName: String,
    onCerrar: () -> Unit,
    onRegisterPet: () -> Unit,
    onPublishAdoption: () -> Unit,
    onRequestTurno: () -> Unit,
    onViewMisTurnos: () -> Unit,
    onServiciosClick: () -> Unit
) {
    ModalDrawerSheet(
        drawerContainerColor = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 8.dp, top = 20.dp, bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "PetCare",
                    color = PetCareTealDark,
                    style = MaterialTheme.typography.titleLarge
                )
                Text(
                    text = userName.ifBlank { "Tutor" },
                    color = PetCareMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            IconButton(onClick = onCerrar) {
                Icon(
                    painter = painterResource(R.drawable.ic_close),
                    contentDescription = "Cerrar menú",
                    tint = PetCareMuted
                )
            }
        }

        HorizontalDivider(color = PetCareLine)

        Spacer(modifier = Modifier.height(8.dp))

        MenuItem(
            texto = "Registrar nueva mascota",
            iconRes = R.drawable.ic_paw,
            onClick = onRegisterPet
        )
        MenuItem(
            texto = "Publicar mascota en adopción",
            iconRes = R.drawable.ic_heart,
            onClick = onPublishAdoption
        )
        MenuItem(
            texto = "Nuevo turno",
            iconRes = R.drawable.ic_add,
            onClick = onRequestTurno
        )
        MenuItem(
            texto = "Mis turnos",
            iconRes = R.drawable.ic_calendar,
            onClick = onViewMisTurnos
        )
        MenuItem(
            texto = "Servicios",
            iconRes = R.drawable.ic_services,
            onClick = onServiciosClick
        )
    }
}

@Composable
private fun MenuItem(
    texto: String,
    iconRes: Int,
    onClick: () -> Unit
) {
    NavigationDrawerItem(
        label = { Text(texto) },
        selected = false,
        onClick = onClick,
        icon = {
            Icon(
                painter = painterResource(iconRes),
                contentDescription = null,
                modifier = Modifier.size(22.dp)
            )
        },
        colors = NavigationDrawerItemDefaults.colors(
            unselectedContainerColor = MaterialTheme.colorScheme.surface,
            unselectedIconColor = PetCareTealDark,
            unselectedTextColor = MaterialTheme.colorScheme.onSurface
        ),
        modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
    )
}
