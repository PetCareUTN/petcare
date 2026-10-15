/**
 * Agrupación de los endpoints en la documentación OpenAPI (/docs).
 *
 * Cada controlador se marca con @ApiTags(EtiquetasApi.LO_QUE_SEA) para que
 * Swagger lo muestre dentro de su módulo. Las etiquetas se declaran acá, y no
 * sueltas como texto en cada controlador, para que un mismo módulo no termine
 * partido en dos grupos por una diferencia de tilde o de mayúscula.
 */
export const EtiquetasApi = {
  USUARIOS: 'Usuarios y autenticación',
  MASCOTAS: 'Mascotas',
  HISTORIA_CLINICA: 'Historia clínica',
  TURNOS: 'Turnos',
  ADOPCIONES: 'Adopciones',
  SERVICIOS: 'Servicios y prestadores',
  VETERINARIOS: 'Veterinarios',
  LOCALIZACION_BLE: 'Localización BLE',
  MEMBRESIAS: 'Membresías y pagos',
  NOTIFICACIONES: 'Notificaciones',
  ADMINISTRACION: 'Administración',
} as const;

/**
 * Orden en que aparecen los grupos en /docs. Swagger respeta el orden en que
 * se declaran las etiquetas, así que conviene arrancar por lo que una persona
 * que recién llega necesita primero (autenticarse) y dejar al final lo que
 * sólo usa el panel de administración.
 */
export const ETIQUETAS_API_ORDENADAS: {
  nombre: string;
  descripcion: string;
}[] = [
  {
    nombre: EtiquetasApi.USUARIOS,
    descripcion:
      'Registro, inicio de sesión (propio y con Google) y datos del perfil.',
  },
  {
    nombre: EtiquetasApi.MASCOTAS,
    descripcion: 'Alta, edición y fotos de las mascotas del usuario.',
  },
  {
    nombre: EtiquetasApi.HISTORIA_CLINICA,
    descripcion:
      'Eventos clínicos, archivos médicos y el asistente de voz que ordena la consulta dictada.',
  },
  {
    nombre: EtiquetasApi.TURNOS,
    descripcion:
      'Turnos de veterinaria y de servicios, disponibilidades y sobreturnos.',
  },
  {
    nombre: EtiquetasApi.ADOPCIONES,
    descripcion:
      'Publicaciones en adopción, solicitudes, favoritos y descartes del listado.',
  },
  {
    nombre: EtiquetasApi.SERVICIOS,
    descripcion:
      'Servicios publicados (paseador, guardería, peluquería) y la solicitud para ser prestador.',
  },
  {
    nombre: EtiquetasApi.VETERINARIOS,
    descripcion: 'Alta de la veterinaria, validación y reportes.',
  },
  {
    nombre: EtiquetasApi.LOCALIZACION_BLE,
    descripcion:
      'Tags Bluetooth, detecciones enviadas por la app y reportes de mascota perdida.',
  },
  {
    nombre: EtiquetasApi.MEMBRESIAS,
    descripcion:
      'Suscripción del veterinario y el webhook que notifica Mercado Pago.',
  },
  {
    nombre: EtiquetasApi.NOTIFICACIONES,
    descripcion: 'Listado y lectura de las notificaciones del usuario.',
  },
  {
    nombre: EtiquetasApi.ADMINISTRACION,
    descripcion:
      'Panel de administración: usuarios, validaciones y suscripciones.',
  },
];

/**
 * Nombre del esquema de seguridad. Se usa en dos lugares que tienen que
 * coincidir: al declararlo en main.ts y al marcar cada endpoint protegido con
 * @ApiBearerAuth(ESQUEMA_AUTENTICACION). Si no coinciden, el botón
 * "Authorize" no manda el token.
 */
export const ESQUEMA_AUTENTICACION = 'token';
