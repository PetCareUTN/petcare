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

> Actualizado para reflejar el contrato de API acordado por el equipo en
> Sprint 1 (documento de definiciones de modelo de usuario) e implementado
> en el PR de `feature/registro-usuario`. Reemplaza la version inicial de
> este contrato, que usaba `rol` como campo de entrada y roles en ingles.

### Endpoint

`POST /auth/register`

### Request

El `rol` **no** se envia en el request: se asigna automaticamente
(`dueño_mascota`) al registrarse. Enviar un campo `rol` u otro campo no
declarado hace que el request sea rechazado con 400.

```json
{
  "nombre": "Ignacio",
  "apellido": "Aldao",
  "email": "usuario@petcare.com",
  "password": "ClaveSegura123"
}
```

### Roles existentes (seed inicial)

- `dueño_mascota` (rol asignado por defecto al registrarse)
- `veterinario`
- `administrador`
- `prestador`

### Response esperado - 201

```json
{
  "id_usuario": 1,
  "nombre": "Ignacio",
  "apellido": "Aldao",
  "email": "usuario@petcare.com",
  "id_rol": 1,
  "estado": "activo",
  "fecha_registro": "2026-07-02T00:00:00.000Z"
}
```

La respuesta no debe incluir `password` ni `passwordHash`.

## Estado actual

El endpoint `POST /auth/register` esta implementado (`AuthController`,
`AuthService`, `UsersService`), con persistencia en PostgreSQL, hash de
contrasena con bcrypt y `ValidationPipe` global para rechazar payloads
invalidos o con campos no declarados.

La suite e2e de registro (`backend/test/auth-register.e2e-spec.ts`) ya esta
activa (sin `describe.skip`) y fue corrida contra PostgreSQL real:
10/10 tests en verde.

## Checklist de integracion para activar la suite

Verificado contra la implementacion real:

- [x] Existe `POST /auth/register`.
- [x] La aplicacion tiene validacion global (`ValidationPipe` con
      `whitelist`/`forbidNonWhitelisted`) para rechazar payloads invalidos
      con 400.
- [x] El modelo `User` incluye `idUsuario`, `nombre`, `apellido`, `email`,
      `password` (hash), `rol`, `fechaRegistro`, `estado` y `updatedAt`.
- [x] El email es unico en base de datos.
- [x] La contrasena se guarda hasheada (bcrypt) y no en texto plano.
- [x] El rol se asigna automaticamente (`dueño_mascota`); no es un campo
      de entrada.
- [x] La respuesta publica de registro no expone `password` ni
      `passwordHash`.
- [x] La base de datos de e2e se limpia entre casos (`usersRepository.clear()`
      en `afterEach`).

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

## P1-30 - Login de usuario

### Contrato esperado

Endpoint: `POST /auth/login`

### Request

```json
{
  "email": "usuario@petcare.com",
  "password": "ClaveSegura123"
}
```

### Response esperado - 200

```json
{
  "token": "jwt-generado",
  "usuario": {
    "id_usuario": 1,
    "nombre": "Ignacio",
    "apellido": "Aldao",
    "email": "usuario@petcare.com",
    "id_rol": 1,
    "estado": "activo",
    "fecha_registro": "2026-07-05T00:00:00.000Z"
  }
}
```

La respuesta no debe incluir `password` ni `passwordHash`.

### Ruta protegida relacionada

Endpoint: `GET /auth/me`

Requiere header:

```text
Authorization: Bearer <token>
```

### Casos de prueba

| ID | Caso | Datos de entrada | Resultado esperado |
|---|---|---|---|
| LOGIN-01 | Login valido | Email y contrasena correctos | 200, token JWT y usuario publico |
| LOGIN-02 | Respuesta segura | Login valido | No devuelve password ni passwordHash |
| LOGIN-03 | Email inexistente | Email no registrado | 401 |
| LOGIN-04 | Contrasena incorrecta | Password incorrecto | 401 |
| LOGIN-05 | Email invalido | Formato incorrecto | 400 |
| LOGIN-06 | Contrasena vacia | Password vacio | 400 |
| LOGIN-07 | Ruta protegida con token | Token valido en `/auth/me` | 200 y usuario publico |
| LOGIN-08 | Ruta protegida sin token | Sin Authorization header | 401 |

### Evidencia esperada para P1-30

- Salida de `npm test`.
- Salida de `npm run test:e2e`.
- Login valido con token JWT.
- Login rechazado con credenciales incorrectas.
- Acceso exitoso a `/auth/me` con token valido.
- Rechazo de `/auth/me` sin token.
