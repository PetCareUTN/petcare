# Casos de prueba - Sprint 1

## Alcance de Ignacio

Historia principal: P1-27 - Crear pruebas de registro e integracion.

Segun la planificacion del sprint, Ignacio trabaja sobre integracion, testing y documentacion tecnica. Estas pruebas dependen de:

- P1-21 - Base de datos y modelo User.
- P1-2 - Endpoint de registro.
- P1-7 - Roles iniciales.

Hasta que esas historias esten implementadas, los casos quedan definidos como contrato esperado.

## P1-27 - Registro de usuario

| ID | Caso | Datos de entrada | Resultado esperado |
|---|---|---|---|
| REG-01 | Registro valido | Todos los campos correctos | 201 y usuario creado |
| REG-02 | Email duplicado | Email ya registrado | 409 |
| REG-03 | Email invalido | Formato incorrecto | 400 |
| REG-04 | Contrasena vacia | Sin contrasena | 400 |
| REG-05 | Nombre vacio | Sin nombre | 400 |
| REG-06 | Rol invalido | Rol no permitido | 400 |
| REG-07 | Respuesta segura | Registro valido | No devuelve password ni passwordHash |
| REG-08 | Persistencia | Registro valido | Usuario guardado en PostgreSQL |
| REG-09 | Contrasena protegida | Registro valido | Contrasena almacenada como hash |

## Contrato esperado

### Endpoint

`POST /auth/register`

### Request

```json
{
  "nombre": "Ignacio",
  "apellido": "Aldao",
  "email": "usuario@petcare.com",
  "password": "ClaveSegura123",
  "rol": "OWNER"
}
```

### Roles permitidos

- `OWNER`
- `VETERINARIAN`
- `ADMIN`

### Response esperado - 201

```json
{
  "id": "uuid-o-id-generado",
  "nombre": "Ignacio",
  "apellido": "Aldao",
  "email": "usuario@petcare.com",
  "rol": "OWNER"
}
```

La respuesta no debe incluir `password` ni `passwordHash`.

## Estado actual

Al inicio de P1-27 el backend solo tiene scaffold de `AuthModule` y `UsersModule`. El endpoint `POST /auth/register`, la persistencia y las validaciones todavia no estan implementados.

Por ese motivo, la suite e2e de registro queda marcada como pendiente hasta que esten integradas P1-21 y P1-2.

## Checklist de integracion para activar la suite

Antes de cambiar `describe.skip` por `describe` en `backend/test/auth-register.e2e-spec.ts`, verificar:

- Existe `POST /auth/register`.
- La aplicacion tiene validacion global o equivalente para rechazar payloads invalidos con 400.
- El modelo `User` incluye `id`, `nombre`, `apellido`, `email`, `passwordHash`, `rol`, `createdAt` y `updatedAt`, o el equipo acordo nombres equivalentes.
- El email es unico en base de datos.
- La contrasena se guarda hasheada y no en texto plano.
- Los roles aceptados son `OWNER`, `VETERINARIAN` y `ADMIN`.
- La respuesta publica de registro no expone `password` ni `passwordHash`.
- La base de datos de e2e puede limpiarse entre casos para evitar dependencia de orden.

## Checklist de revision del PR de registro

- El endpoint devuelve 201 para un registro valido.
- El endpoint devuelve 409 para email duplicado.
- El endpoint devuelve 400 para email invalido, nombre vacio, contrasena vacia y rol invalido.
- La implementacion no mezcla responsabilidades: `AuthController` recibe HTTP, `AuthService` orquesta el registro y `UsersService` resuelve persistencia de usuarios.
- Los errores de validacion y conflicto son consistentes con NestJS.
- Los tests unitarios de registro cubren exito, duplicado y validaciones principales.
- Los tests e2e cubren el flujo HTTP real contra la aplicacion NestJS.

## Evidencia esperada para el informe de sprint

Cuando P1-27 quede activada contra la implementacion real, registrar:

- Salida de `npm test`.
- Salida de `npm run test:e2e`.
- Captura o log de registro valido con 201.
- Captura o log de email duplicado con 409.
- Evidencia de que el usuario queda persistido en PostgreSQL.
- Evidencia de que la contrasena no queda almacenada en texto plano.
