import { SolicitudCompartirMascotaEstado } from '../../common/enums/solicitud-compartir-mascota-estado.enum';
import { SolicitudCompartirMascota } from '../entities/solicitud-compartir-mascota.entity';

export class SolicitudCompartirResponseDto {
  idSolicitud: number;
  estado: SolicitudCompartirMascotaEstado;
  createdAt: Date;
  idMascota: number;
  nombreMascota: string;
  especieMascota: string;
  fotoMascota: string | null;
  idUsuarioOrigen: number;
  nombreOrigen: string;
  idUsuarioDestino: number;
  nombreDestino: string;

  static fromEntity(
    solicitud: SolicitudCompartirMascota,
  ): SolicitudCompartirResponseDto {
    return {
      idSolicitud: solicitud.idSolicitud,
      estado: solicitud.estado,
      createdAt: solicitud.createdAt,
      idMascota: solicitud.mascota.idMascota,
      nombreMascota: solicitud.mascota.nombre,
      especieMascota: solicitud.mascota.especie,
      fotoMascota: solicitud.mascota.foto,
      idUsuarioOrigen: solicitud.origen.idUsuario,
      nombreOrigen: nombreCompleto(solicitud.origen),
      idUsuarioDestino: solicitud.destino.idUsuario,
      nombreDestino: nombreCompleto(solicitud.destino),
    };
  }
}

function nombreCompleto(user: {
  nombre: string;
  apellido: string | null;
}): string {
  return [user.nombre, user.apellido].filter(Boolean).join(' ');
}
