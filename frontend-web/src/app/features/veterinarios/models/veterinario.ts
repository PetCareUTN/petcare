export interface SolicitudRequest {
  numeroDocumento: string;
  numeroMatricula: string;
  provinciaMatricula: string;
  matricula: File;
}

export interface VeterinarioResponse {
  idVeterinario: number;
  idUsuario: number;
  numeroDocumento: string;
  numeroMatricula: string;
  provinciaMatricula: string;
  matriculaUrl: string;
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  motivoRechazo: string | null;
  createdAt: string;
}

export interface SolicitudPendiente {
  idVeterinario: number;
  nombre: string;
  apellido: string;
  email: string;
  fechaSolicitud: string;
}

export interface SolicitudDetalle {
  idVeterinario: number;
  numeroDocumento: string;
  numeroMatricula: string;
  provinciaMatricula: string;
  matriculaUrl: string;
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  motivoRechazo: string | null;
  fechaSolicitud: string;
  usuario: {
    idUsuario: number;
    nombre: string;
    apellido: string;
    email: string;
  };
}
