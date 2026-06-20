# PetCare

PetCare es una plataforma digital orientada a optimizar la gestión y el cuidado de mascotas. Su propósito es centralizar la información de usuarios, mascotas e historias clínicas y ofrecer una base tecnológica para incorporar progresivamente funcionalidades como turnos, adopciones, notificaciones, membresías y localización colaborativa mediante tecnología Bluetooth Low Energy (BLE).

Este repositorio contiene el código fuente, la documentación técnica, los diagramas, los scripts de base de datos y los recursos necesarios para desarrollar, probar y desplegar el sistema.

---

## Alcance funcional

### Módulos principales

- Gestión de usuarios, perfiles y roles.
- Perfil digital de mascota.
- Historia clínica unificada.
- Gestión de turnos y servicios.
- Gestión de adopciones.
- Notificaciones.
- Membresías.
- Ecosistema BLE para seguridad y localización colaborativa.

### Alcance inicial de desarrollo

La priorización y el orden de implementación se gestionan mediante el User Story Map y el Product Backlog. El desarrollo comienza por los módulos de:

- Usuarios, perfiles y roles.
- Perfil digital de mascota.
- Historia clínica unificada.

El resto de los módulos se incorporará de forma incremental según prioridad, valor y riesgo técnico.

---

## Arquitectura

PetCare adopta una arquitectura de monolito modular.

Esto permite mantener un único backend desplegable, organizado internamente por módulos de dominio independientes, reduciendo la complejidad operativa durante las primeras etapas del proyecto.

### Componentes principales

- Backend API REST.
- Frontend web.
- Aplicación móvil Android.
- Base de datos PostgreSQL.
- Servicio de notificaciones push.
- Integraciones BLE.
- Servicios de almacenamiento y monitoreo.

---

## Stack tecnológico

> Esta sección debe actualizarse si alguna decisión técnica cambia durante el proyecto.

### Backend

- Node.js
- NestJS
- TypeScript
- API REST
- JWT para autenticación y autorización

### Frontend web

- Angular
- TypeScript
- HTML
- CSS

### Aplicación móvil

- Kotlin
- Android SDK
- Android BLE APIs
- Firebase Cloud Messaging

### Base de datos

- PostgreSQL
- Migraciones y scripts versionados

### Infraestructura y herramientas

- Docker
- Docker Compose
- GitHub
- GitHub Actions
- Jira
- Figma
- Postman
- Swagger / OpenAPI

---

## Estructura del repositorio

```text
petcare/
├── backend/
│   ├── src/
│   ├── test/
│   ├── .env.example
│   └── README.md
│
├── frontend-web/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   └── README.md
│
├── mobile-android/
│   ├── app/
│   └── README.md
│
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── README.md
│
├── docs/
│   ├── instancia-1/
│   ├── instancia-2/
│   ├── arquitectura/
│   ├── testing/
│   ├── sprints/
│   └── manuales/
│
├── diagrams/
│   ├── arquitectura/
│   ├── procesos/
│   ├── uml/
│   └── wbs/
│
├── .github/
│   ├── workflows/
│   └── pull_request_template.md
│
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## Requisitos previos

Antes de ejecutar el proyecto, se deberá contar con:

- Git
- Node.js
- npm
- Docker
- Docker Compose
- PostgreSQL, si no se utiliza Docker
- Android Studio
- JDK compatible con el proyecto Android
- Un editor como Visual Studio Code o IntelliJ IDEA

Las versiones exactas deberán mantenerse documentadas en esta sección o en los README de cada componente.

---

## Configuración inicial

### Clonar el repositorio

```bash
git clone URL_DEL_REPOSITORIO
cd petcare
```

### Variables de entorno

Cada componente debe incluir un archivo `.env.example` con las variables necesarias.

Ejemplo para backend:

```env
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=petcare
DATABASE_USER=petcare_user
DATABASE_PASSWORD=change_me

JWT_SECRET=change_me
JWT_EXPIRES_IN=1d
```

Luego se debe crear un archivo `.env` local:

```bash
cp backend/.env.example backend/.env
```

Nunca se deben subir al repositorio archivos `.env`, credenciales, claves privadas, tokens o secretos reales.

---

## Ejecución local

> Los comandos deben actualizarse cuando los proyectos estén inicializados.

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend web

```bash
cd frontend-web
npm install
npm start
```

### Base de datos con Docker

```bash
docker compose up -d
```

### Aplicación móvil Android

Abrir la carpeta `mobile-android/` con Android Studio y ejecutar la aplicación en un emulador o dispositivo físico.

Para pruebas BLE se recomienda utilizar un dispositivo Android físico.

---

## Flujo de ramas

El repositorio utiliza el siguiente esquema:

- `main`: versión estable y demostrable.
- `develop`: rama de integración.
- `feature/*`: nuevas funcionalidades.
- `fix/*`: correcciones de errores.
- `docs/*`: cambios de documentación.
- `test/*`: incorporación o modificación de pruebas.
- `chore/*`: configuración y mantenimiento.
- `hotfix/*`: correcciones urgentes sobre una versión estable.

### Ejemplo

```bash
git checkout develop
git pull origin develop
git checkout -b feature/registro-usuario
```

Luego:

```bash
git add .
git commit -m "feat(auth): implementar registro de usuario"
git push -u origin feature/registro-usuario
```

El trabajo debe integrarse mediante Pull Request hacia `develop`.

No se debe trabajar directamente sobre `main`.

---

## Convención de commits

Se utiliza Conventional Commits.

Formato:

```text
tipo(área): descripción breve
```

Ejemplos:

```text
feat(auth): agregar registro de usuario
feat(pets): implementar alta de mascota
fix(auth): corregir validación de contraseña
test(history): agregar pruebas de historia clínica
docs: actualizar arquitectura C4
chore: configurar docker compose
refactor(users): reorganizar servicio de usuarios
```

Tipos permitidos:

- `feat`: nueva funcionalidad.
- `fix`: corrección de errores.
- `test`: pruebas.
- `docs`: documentación.
- `chore`: configuración o mantenimiento.
- `refactor`: reorganización interna sin cambio funcional.

---

## Pull Requests

Todo cambio debe ingresar mediante Pull Request.

Cada Pull Request debe incluir:

- Historia o tarea de Jira relacionada.
- Descripción del cambio.
- Evidencias de funcionamiento.
- Pruebas realizadas.
- Impacto sobre otros módulos.
- Capturas o resultados cuando corresponda.

Antes de aprobar un Pull Request se debe verificar:

- El código compila.
- Los criterios de aceptación se cumplen.
- Las pruebas existentes siguen funcionando.
- No se incluyeron secretos.
- La documentación fue actualizada.
- La rama está sincronizada con `develop`.

Se requiere al menos una aprobación de otro integrante.

---

## Gestión de tareas

El trabajo se gestiona en Jira.

Cada historia debe contener:

- Código o identificador.
- Título.
- Descripción en formato de historia de usuario.
- Criterios de aceptación.
- Prioridad.
- Estimación en Story Points.
- Épica asociada.
- Responsable.
- Estado.

Estados sugeridos:

```text
Por hacer
En progreso
En revisión
En testing
Finalizada
```

---

## Definition of Ready

Una historia está lista para comenzar cuando:

- Está redactada en formato de historia de usuario.
- Tiene criterios de aceptación claros.
- Tiene prioridad definida.
- Tiene estimación.
- No posee bloqueos conocidos.
- Se conoce el actor y el valor esperado.
- Tiene los diseños o referencias necesarias.

---

## Definition of Done

Una historia se considera terminada cuando:

- La funcionalidad fue implementada.
- El código fue subido al repositorio.
- El Pull Request fue revisado y aprobado.
- Los criterios de aceptación fueron cumplidos.
- Las pruebas correspondientes fueron ejecutadas.
- No existen errores críticos conocidos.
- La funcionalidad fue integrada correctamente.
- La documentación fue actualizada.
- La historia puede demostrarse en una Sprint Review.

---

## Testing

El proyecto contempla los siguientes niveles de prueba:

- Pruebas unitarias.
- Pruebas de integración.
- Pruebas end-to-end.
- Pruebas de aceptación.
- Pruebas básicas de seguridad.
- Pruebas específicas de BLE.

### Herramientas previstas

- Backend: Jest y Supertest.
- Frontend web: herramientas de testing de Angular.
- Aplicación Android: JUnit, Mockito y Espresso.
- API: Postman y Newman.
- End-to-end web: Cypress o Playwright.

Las pruebas deben ejecutarse antes de integrar cambios en `develop`.

---

## Seguridad

Se deben respetar las siguientes reglas:

- No subir secretos ni credenciales.
- Utilizar variables de entorno.
- Cifrar contraseñas.
- Validar datos de entrada.
- Aplicar autorización por roles.
- Evitar exponer información clínica o personal.
- Anonimizar detecciones BLE cuando corresponda.
- No almacenar datos personales dentro de los tags BLE.
- Revisar dependencias con vulnerabilidades conocidas.

---

## Ecosistema BLE

Los dispositivos BLE no almacenan información personal ni clínica.

El tag transmite un identificador técnico, cuya asociación se gestiona en el backend:

```text
Identificador BLE → Mascota → Usuario
```

La ubicación se obtiene desde el dispositivo móvil que detecta el tag. BLE no funciona como un rastreador GPS autónomo.

Las pruebas BLE deben realizarse con dispositivos compatibles previamente validados.

---

## Documentación

Toda la documentación debe mantenerse versionada.

Incluye:

- Estudio inicial.
- Plan de proyecto.
- WBS.
- Plan de riesgos.
- Working Agreement.
- Arquitectura C4.
- ADRs.
- Plan de testing.
- User Story Map.
- Product Backlog.
- Informes de sprint.
- Manuales.
- Evidencias de pruebas.
- Documentación de despliegue.

Los documentos deben actualizarse cuando una decisión técnica o funcional cambie.

---

## Decisiones de arquitectura

Las decisiones importantes deben registrarse mediante ADRs.

Cada ADR debe incluir:

- Contexto.
- Decisión.
- Alternativas consideradas.
- Consecuencias.
- Estado.
- Fecha.

Ubicación sugerida:

```text
docs/arquitectura/adrs/
```

---

## Integración continua

El proyecto debe incorporar un pipeline de CI que permita:

- Instalar dependencias.
- Compilar el proyecto.
- Ejecutar pruebas.
- Ejecutar análisis estático.
- Validar Pull Requests.
- Generar reportes de cobertura.

El pipeline debe impedir integrar cambios que no compilen o que fallen en pruebas críticas.

---

## Ambientes

Se contemplan los siguientes ambientes:

- Desarrollo: trabajo local del equipo.
- Staging: validación integrada y pruebas.
- Demo o producción académica: versión estable para presentaciones.

Cada ambiente debe contar con variables de configuración independientes.

---

## Monitoreo y logs

El sistema debe registrar información suficiente para diagnosticar errores sin exponer datos sensibles.

Se recomienda registrar:

- Errores de aplicación.
- Fallos de autenticación.
- Errores de integración.
- Eventos relevantes de backend.
- Fallos de notificaciones.
- Errores vinculados a BLE.

No deben registrarse contraseñas, tokens, datos clínicos sensibles ni información personal innecesaria.

---

## Política de uso de inteligencia artificial

Las herramientas de inteligencia artificial pueden utilizarse para:

- Generar ideas.
- Proponer estructuras de código.
- Redactar documentación.
- Diseñar pruebas.
- Revisar textos.
- Elaborar diagramas.

Todo contenido generado debe ser revisado por un integrante del equipo.

No se deben cargar en herramientas externas:

- Credenciales.
- Claves privadas.
- Datos personales reales.
- Historias clínicas reales.
- Información confidencial de la organización relevada.

---

## Equipo

Proyecto desarrollado por el Grupo 22 de la asignatura Proyecto Final de Ingeniería en Sistemas de Información, Universidad Tecnológica Nacional, Facultad Regional Córdoba.

Integrantes:

- Ignacio Aldao
- Simon Breitkopf
- Franca Ferreyra Lammertyn
- Mauricio Herrera
- Sofía Muñoz Faya
- Felipe Nicolás Olivera

---

## Licencia

Actualmente el proyecto no posee una licencia pública definida.

Al tratarse de un repositorio académico y privado, no se autoriza la redistribución o reutilización del código sin consentimiento del equipo.

---

## Contacto

Para consultas relacionadas con el proyecto, utilizar los canales internos del equipo o el tablero de Jira.

---

## Nota final

Este README debe mantenerse actualizado durante todo el proyecto.

Toda modificación relevante en arquitectura, stack, comandos de ejecución, estructura, ambientes o metodología debe reflejarse en este archivo.
