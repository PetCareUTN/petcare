import { CategoriaServicio } from '../../common/enums/categoria-servicio.enum';
import { DiaSemana } from '../../common/enums/dia-semana.enum';
import { DisponibilidadServicio } from '../entities/disponibilidad-servicio.entity';
import { Servicio } from '../entities/servicio.entity';

export class DisponibilidadResponseDto {
  idDisponibilidad: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;

  static fromEntity(
    disponibilidad: DisponibilidadServicio,
  ): DisponibilidadResponseDto {
    return {
      idDisponibilidad: disponibilidad.idDisponibilidad,
      diaSemana: disponibilidad.diaSemana,
      horaInicio: disponibilidad.horaInicio,
      horaFin: disponibilidad.horaFin,
    };
  }
}

export interface UbicacionServicio {
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
}

export class ServicioResponseDto {
  idServicio: number;
  idUsuario: number;
  nombrePrestador: string;
  categoria: CategoriaServicio;
  descripcion: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  disponibilidades: DisponibilidadResponseDto[];

  static fromEntity(
    servicio: Servicio,
    ubicacion?: UbicacionServicio | null,
  ): ServicioResponseDto {
    return {
      idServicio: servicio.idServicio,
      idUsuario: servicio.usuario.idUsuario,
      nombrePrestador: [servicio.usuario.nombre, servicio.usuario.apellido]
        .filter(Boolean)
        .join(' '),
      categoria: servicio.categoria,
      descripcion: servicio.descripcion,
      direccion: ubicacion?.direccion ?? null,
      latitud: ubicacion?.latitud ?? null,
      longitud: ubicacion?.longitud ?? null,
      disponibilidades: (servicio.disponibilidades ?? []).map((d) =>
        DisponibilidadResponseDto.fromEntity(d),
      ),
    };
  }
}
