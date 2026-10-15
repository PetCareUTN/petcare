import { ReportePerdidaEstado } from '../../common/enums/reporte-perdida-estado.enum';
import { ReportePerdida } from '../entities/reporte-perdida.entity';

export class ReportePerdidaResponseDto {
  idReporte: number;
  idMascota: number;
  nombreMascota: string | null;
  fotoMascota: string | null;
  estado: ReportePerdidaEstado;
  fechaPerdida: string;
  latitud: number;
  longitud: number;
  descripcion: string | null;
  contacto: string | null;
  fechaCierre: string | null;

  static fromEntity(reporte: ReportePerdida): ReportePerdidaResponseDto {
    return {
      idReporte: reporte.idReporte,
      idMascota: reporte.mascota.idMascota,
      nombreMascota: reporte.mascota.nombre ?? null,
      fotoMascota: reporte.mascota.foto ?? null,
      estado: reporte.estado,
      fechaPerdida: reporte.fechaPerdida.toISOString(),
      latitud: Number(reporte.latitud),
      longitud: Number(reporte.longitud),
      descripcion: reporte.descripcion,
      contacto: reporte.contacto,
      fechaCierre: reporte.fechaCierre?.toISOString() ?? null,
    };
  }
}
