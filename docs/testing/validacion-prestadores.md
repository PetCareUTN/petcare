# Validación de prestadores

## Alcance y uso

- Web: únicamente Administración → Prestadores y reportes para revisar solicitudes de dueños. El panel veterinario conserva su flujo existente.
- Android: Mis servicios → Quiero ofrecer un servicio / Mis solicitudes.
- Reseñas y reportes: Android en Mis turnos → Servicios realizados, reseñas y reportes.
- Comprobaciones y reputación: pestaña Prestadores en Android.

Los dueños solicitan aprobación por categoría (paseador, guardería o peluquería) desde Android, manteniendo su rol y acceso como dueño. Los veterinarios usan la validación profesional que ya tenían (matrícula y habilitación revisadas por administración): no presentan una segunda solicitud de prestador. La API de solicitud está restringida al rol dueño.

Se exige documento de identidad, datos de contacto, experiencia, protocolo de cuidados y consentimiento. Las referencias son opcionales y deben contar con autorización para ser contactadas. Guardería exige dirección, capacidad y evidencia del espacio. Peluquería exige evidencia de trabajos o capacitación. Un archivo adjunto no se interpreta como una comprobación de autenticidad.

El administrador debe realizar la comparación de identidad (por ejemplo, videollamada), contactar al solicitante y revisar las condiciones de la categoría. Debe registrar el método y resultado en el motivo de la decisión. No hay verificación biométrica, telefónica ni de matrículas automatizada en este módulo.

Estados: pendiente → aprobado / corrección / rechazado. Corrección y rechazado permiten volver a enviar. Aprobado puede suspenderse. Una suspensión requiere revisión administrativa; el usuario no puede eludirla enviando otra solicitud. Administración puede pedir correcciones para obtener evidencia actualizada antes de rehabilitarlo. Las decisiones se registran con fecha y administrador y notifican al solicitante dentro de PetCare.

## Publicación, reservas y reputación

- El backend comprueba la categoría aprobada para dueños y la validación profesional existente para veterinarios al crear/editar servicios, consultar el detalle ajeno, ofrecer horarios y reservar. El catálogo aplica las mismas reglas y exige una cuenta activa.
- Los servicios anteriores de dueños quedan conservados, pero requieren aprobación por categoría para aparecer en el catálogo o recibir nuevas reservas. Los veterinarios ya aprobados conservan su habilitación existente.
- No se cambia la categoría de una publicación existente: se crea otra, para preservar la categoría de las reservas y reseñas anteriores.
- No se permite reservar un servicio propio ni crear reservas con inicio pasado.
- Solo el dueño de la reserva confirma la realización después del horario de finalización. Se usa la zona horaria argentina (UTC−03:00).
- Solo las reservas completadas admiten reseña; hay una por reserva, con puntuación de 1 a 5. El promedio y el número de servicios completados corresponden a esa categoría.
- Las reseñas acreditan reservas registradas y confirmadas por el cliente; no prueban presencialmente que el trabajo ocurrió ni impiden acuerdos fraudulentos entre cuentas.
- El dueño puede reportar su reserva incluso si fue cancelada. Hay un reporte por reserva. Un reporte no suspende automáticamente: administración investiga, registra la resolución y puede suspender la categoría.
- La suspensión por categoría corresponde a prestadores dueños. La validación profesional de veterinarios se gestiona en su módulo existente.
- Una suspensión impide nuevas publicaciones y reservas. Las reservas confirmadas siguen visibles, se pueden cancelar y necesitan seguimiento con las partes; no se cancelan automáticamente.
- Los perfiles muestran «Identidad revisada» y, cuando corresponde, «Referencias comprobadas». No presentan una garantía de seguridad.

## Archivos privados

Los documentos se almacenan como binarios en una tabla separada, sin URLs públicas y sin exponer el contenido en los listados. Se acepta PDF, PNG y JPEG con comprobación de firma, hasta 5 MB por archivo (un documento de identidad y hasta cuatro evidencias). El acceso requiere la cuenta titular o un administrador vigente; la respuesta fuerza descarga y desactiva caché.

Cada archivo vence a los 30 días desde su carga. El endpoint deja de entregarlo al vencer, y el proceso de backend elimina archivos vencidos al iniciar y cada hora. No requiere un scheduler externo. Si vencen mientras se revisa, administración debe pedir correcciones. Los datos del formulario, historial y resultados permanecen registrados. Las copias descargadas por revisores y las copias de respaldo necesitan una política operativa de eliminación propia; el borrado de la tabla activa no elimina backups.

## Instalación

Con PostgreSQL disponible y las variables locales configuradas, ejecutar desde `backend`:

```sh
npm run migration:run
npm run start:dev
```

La migración `1788600000000-ValidacionPrestadores.ts` crea solicitudes, documentos, reseñas y reportes, con claves foráneas y restricciones de unicidad. No aprueba automáticamente a cuentas existentes ni cambia sus roles. Debe aplicarse antes de iniciar esta versión del backend.

## Verificación funcional

1. Un dueño sin solicitud no puede publicar ni reservar un servicio de un prestador sin aprobar, incluso llamando directamente a la API.
2. Enviar paseador sin documento, o guardería sin capacidad/dirección/evidencia, devuelve 400.
3. Una solicitud válida queda pendiente; el dueño conserva acceso a sus mascotas y reservas.
4. Otro dueño no puede leer sus archivos; un JWT antiguo de un administrador que perdió el rol no permite revisarlos.
5. Aprobar sin las comprobaciones obligatorias o con documentos vencidos falla. Dos revisores no pueden sobrescribir la misma versión.
6. Solicitar correcciones permite editar datos y reemplazar documentos; se preserva el historial.
7. Aprobar paseador permite publicarlo, pero no habilita guardería. El catálogo muestra exclusivamente categorías aprobadas.
8. Reservar el servicio propio o un horario pasado falla.
9. Una reserva futura, cancelada o ajena no puede completarse. Una reserva pasada confirmada se puede completar por su dueño.
10. Solo una reserva completada admite una reseña; repetirla falla. El perfil refleja promedio y cantidad de completados.
11. Reportar una reserva ajena o repetir un reporte falla. Una cancelación propia sí admite reporte.
12. Resolver con suspensión oculta la categoría del catálogo y bloquea nuevas reservas. El dueño conserva su cuenta y sus reservas previas.
13. Un prestador suspendido no puede enviar una nueva solicitud para evitar la revisión administrativa.
14. Al vencer un archivo, su descarga deja de estar disponible; la limpieza lo elimina de la base activa.
15. Un veterinario aprobado puede ofrecer sus servicios con su validación existente, sin solicitar el alta de prestador; uno pendiente o rechazado permanece bloqueado.
16. La web no presenta alta de prestador, reservas del dueño ni catálogo para dueños. Conserva la revisión administrativa de las solicitudes enviadas desde Android.

Pruebas automáticas: `npm test -- --runInBand` en backend; `npm test -- --watch=false` en frontend-web; `gradlew.bat :app:compileDebugKotlin :app:testDebugUnitTest` en mobile-android.

## Resultado de validación local (5 de septiembre de 2026)

- Backend: compilación correcta; 18 suites y 227 pruebas aprobadas. El módulo nuevo también pasa ESLint.
- Web: compilación de desarrollo correcta; 5 pruebas aprobadas, incluidas la revisión administrativa y las regresiones que aseguran que la web no ofrece alta de dueño ni exige una segunda validación al veterinario.
- Android: compilación y pruebas unitarias correctas.
- La compilación web de producción sigue bloqueada por el presupuesto de tamaño del CSS preexistente de gestión de turnos veterinarios (10,61 kB frente al límite de 8 kB).
- PostgreSQL local: la migración de prestadores ya figuraba aplicada. Pasó la prueba `npx ts-node test/prestadores-regression.ts`: solicitud de dueño, aprobación administrativa, validación veterinaria existente, consulta del catálogo y suspensión. Todos los datos de prueba se revirtieron al terminar. Esta prueba ejecuta los servicios contra PostgreSQL; no sustituye la revisión visual de las pantallas en dispositivos reales.
- Rama de trabajo: `feature/validacion-prestadores`, según la convención del README; integración prevista mediante PR hacia `develop`.
