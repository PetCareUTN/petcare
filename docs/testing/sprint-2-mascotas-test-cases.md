# Sprint 2 - Registro de mascota

## P1-11 - Registrar mascota

### Alcance

- Crear persistencia para mascotas.
- Asociar cada mascota al usuario autenticado mediante `usuarios_mascotas`.
- Registrar una mascota desde API.
- Registrar una mascota desde la pantalla web.
- Validar campos obligatorios.
- Guardar evidencia de pruebas.

### Contrato backend

Endpoint:

```text
POST /mascotas
```

Requiere:

```text
Authorization: Bearer <token>
```

Body:

```json
{
  "nombre": "Milo",
  "especie": "Perro",
  "raza": "Mestizo",
  "sexo": "macho",
  "fechaNacimiento": "2021-05-10",
  "peso": 12.5,
  "esterilizado": true,
  "foto": "https://example.com/milo.jpg",
  "observaciones": "Sin observaciones relevantes"
}
```

El usuario duenio no se envia en el body. El backend lo toma del JWT y crea la relacion en `usuarios_mascotas`.

### Response esperado - 201

```json
{
  "idMascota": 1,
  "nombre": "Milo",
  "idHistoria": null,
  "especie": "Perro",
  "raza": "Mestizo",
  "sexo": "macho",
  "fechaNacimiento": "2021-05-10",
  "peso": 12.5,
  "esterilizado": true,
  "foto": "https://example.com/milo.jpg",
  "observaciones": "Sin observaciones relevantes",
  "idUsuarios": [1]
}
```

### Casos de prueba

| ID | Caso | Datos de entrada | Resultado esperado |
|---|---|---|---|
| PET-01 | Registro sin token | Body valido sin Authorization | 401 |
| PET-02 | Registro exitoso | Body valido con JWT | 201 |
| PET-03 | Persistencia y asociacion | Body valido con JWT | Mascota en `mascotas` y relacion en `usuarios_mascotas` |
| PET-04 | Campo obligatorio faltante | `nombre` vacio | 400 |
| PET-05 | Campo no permitido | Body con `idUsuario` | 400 |

### Evidencia esperada

- Salida de `npm run build` en backend.
- Salida de `npm run lint` en backend.
- Salida de `npx jest --runInBand` en backend.
- Salida de `npx jest --config ./test/jest-e2e.json --runInBand` en backend.
- Salida de `npm run build` en frontend.
- Prueba manual desde `/mascotas/nueva` con backend y base de datos levantados.
