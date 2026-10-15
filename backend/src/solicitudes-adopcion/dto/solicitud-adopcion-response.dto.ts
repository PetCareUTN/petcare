import { SolicitudAdopcionEstado } from '../../common/enums/solicitud-adopcion-estado.enum';
import { TipoVivienda } from '../../common/enums/tipo-vivienda.enum';
import { SolicitudAdopcion } from '../entities/solicitud-adopcion.entity';

export class SolicitudAdopcionResponseDto {
  idSolicitud: number;
  idPublicacion: number;
  idMascota: number;
  nombreMascota: string;
  fotoMascota: string | null;
  estado: SolicitudAdopcionEstado;
  motivoRechazo: string | null;
  tipoVivienda: TipoVivienda | null;
  tienePatio: boolean | null;
  tieneOtrasMascotas: boolean | null;
  tieneNinos: boolean | null;
  tuvoMascotasAntes: boolean | null;
  motivo: string | null;
  informacionAdicional: string | null;
  createdAt: Date;
  idSolicitante: number;
  nombreSolicitante: string;
  emailSolicitante: string;
  telefonoSolicitante: string | null;
  idDuenio: number;
  nombreDuenio: string;
  emailDuenio: string | null;
  telefonoDuenio: string | null;

  static fromEntity(
    solicitud: SolicitudAdopcion,
  ): SolicitudAdopcionResponseDto {
    // El contacto del dueño solo se comparte una vez que hay match
    // (solicitud aceptada): antes de eso es información privada.
    const hayMatch = solicitud.estado === SolicitudAdopcionEstado.ACEPTADA;

    return {
      idSolicitud: solicitud.idSolicitud,
      idPublicacion: solicitud.publicacion.idPublicacion,
      idMascota: solicitud.publicacion.mascota.idMascota,
      nombreMascota: solicitud.publicacion.mascota.nombre,
      fotoMascota: solicitud.publicacion.mascota.foto,
      estado: solicitud.estado,
      motivoRechazo: solicitud.motivoRechazo,
      tipoVivienda: solicitud.tipoVivienda,
      tienePatio: solicitud.tienePatio,
      tieneOtrasMascotas: solicitud.tieneOtrasMascotas,
      tieneNinos: solicitud.tieneNinos,
      tuvoMascotasAntes: solicitud.tuvoMascotasAntes,
      motivo: solicitud.motivo,
      informacionAdicional: solicitud.informacionAdicional,
      createdAt: solicitud.createdAt,
      idSolicitante: solicitud.solicitante.idUsuario,
      nombreSolicitante: [
        solicitud.solicitante.nombre,
        solicitud.solicitante.apellido,
      ]
        .filter(Boolean)
        .join(' '),
      emailSolicitante: solicitud.solicitante.email,
      telefonoSolicitante: solicitud.solicitante.telefono,
      idDuenio: solicitud.publicacion.usuario.idUsuario,
      nombreDuenio: [
        solicitud.publicacion.usuario.nombre,
        solicitud.publicacion.usuario.apellido,
      ]
        .filter(Boolean)
        .join(' '),
      emailDuenio: hayMatch ? solicitud.publicacion.usuario.email : null,
      telefonoDuenio: hayMatch ? solicitud.publicacion.usuario.telefono : null,
    };
  }
}
