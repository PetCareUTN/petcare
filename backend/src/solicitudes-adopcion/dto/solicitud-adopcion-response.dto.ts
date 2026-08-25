import { SolicitudAdopcionEstado } from '../../common/enums/solicitud-adopcion-estado.enum';
import { SolicitudAdopcion } from '../entities/solicitud-adopcion.entity';

export class SolicitudAdopcionResponseDto {
  idSolicitud: number;
  idPublicacion: number;
  idMascota: number;
  nombreMascota: string;
  estado: SolicitudAdopcionEstado;
  motivoRechazo: string | null;
  createdAt: Date;
  idSolicitante: number;
  nombreSolicitante: string;
  emailSolicitante: string;
  telefonoSolicitante: string | null;

  static fromEntity(
    solicitud: SolicitudAdopcion,
  ): SolicitudAdopcionResponseDto {
    return {
      idSolicitud: solicitud.idSolicitud,
      idPublicacion: solicitud.publicacion.idPublicacion,
      idMascota: solicitud.publicacion.mascota.idMascota,
      nombreMascota: solicitud.publicacion.mascota.nombre,
      estado: solicitud.estado,
      motivoRechazo: solicitud.motivoRechazo,
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
    };
  }
}
