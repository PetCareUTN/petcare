# Sprint 3 - Registro de evento clinico

## P1-16 / P1-51 - Probar registro de evento clinico

### Alcance

- Probar registro exitoso de un evento clinico.
- Probar validaciones de campos obligatorios.
- Verificar asociacion con la mascota correcta.
- Verificar permisos de registro para usuarios autorizados.
- Dejar evidencia para Sprint Review.

### Contrato backend

Endpoint:

```text
POST /eventos-clinicos
```

Requiere:

```text
Authorization: Bearer <token-veterinario-aprobado>
Content-Type: application/json
```

Body:

```json
{
  "idMascota": 1,
  "tipo": "diagnostico",
  "fecha": "2026-08-03",
  "descripcion": "Consulta por tos persistente",
  "diagnostico": "Bronquitis leve",
  "tratamiento": "Reposo y control",
  "observaciones": "Controlar evolucion en 7 dias"
}
```

El usuario veterinario no se envia en el body. El backend lo toma del JWT, valida rol `veterinario`, valida que el perfil profesional este `APROBADO`, busca la mascota y registra el evento dentro de su historia clinica.

Si la mascota todavia no tiene historia clinica, el backend crea una y la asocia mediante `mascotas.id_historia`.

### Response esperado - 201

```json
{
  "idEvento": 1,
  "idHistoria": 1,
  "idMascota": 1,
  "idVeterinario": 1,
  "tipo": "diagnostico",
  "fecha": "2026-08-03",
  "descripcion": "Consulta por tos persistente",
  "diagnostico": "Bronquitis leve",
  "tratamiento": "Reposo y control",
  "observaciones": "Controlar evolucion en 7 dias",
  "createdAt": "2026-08-03T00:00:00.000Z",
  "updatedAt": "2026-08-03T00:00:00.000Z"
}
```

### Casos de prueba automatizados

| ID | Caso | Datos de entrada | Resultado esperado |
|---|---|---|---|
| CLIN-01 | Registro exitoso | JWT de veterinario aprobado + body valido | 201, evento persistido y asociado a la mascota correcta |
| CLIN-02 | Campo obligatorio faltante | Body sin `descripcion` | 400 |
| CLIN-03 | Mascota inexistente | `idMascota` inexistente | 404 |
| CLIN-04 | Usuario no veterinario | JWT de duenio de mascota | 403 |
| CLIN-05 | Veterinario no aprobado | JWT de veterinario pendiente | 403 |

Archivo:

```text
backend/test/clinical-events.e2e-spec.ts
```

### Evidencia ejecutada

```text
cd backend
npm run test:e2e -- clinical-events.e2e-spec.ts --runInBand
npm run build
npm test -- eventos-clinicos.service.spec.ts --runInBand
```

Resultados locales:

```text
clinical-events.e2e-spec.ts: 1 suite OK, 5 tests OK
backend build: OK
eventos-clinicos.service.spec.ts: 1 suite OK, 4 tests OK
```

### Evidencia manual sugerida para Sprint Review

1. Iniciar backend y frontend.
2. Iniciar sesion con un usuario veterinario aprobado.
3. Abrir `/eventos-clinicos/nuevo`.
4. Completar `idMascota`, `tipo`, `fecha` y `descripcion`.
5. Registrar el evento.
6. Verificar mensaje de exito con `idHistoria` e `idEvento`.
7. Validar en base de datos que el evento exista en `eventos_clinicos` y que `mascotas.id_historia` coincida con la historia devuelta.
