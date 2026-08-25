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

export class ServicioResponseDto {
  idServicio: number;
  idUsuario: number;
  nombrePrestador: string;
  categoria: CategoriaServicio;
  descripcion: string | null;
  disponibilidades: DisponibilidadResponseDto[];

  static fromEntity(servicio: Servicio): ServicioResponseDto {
    return {
      idServicio: servicio.idServicio,
      idUsuario: servicio.usuario.idUsuario,
      nombrePrestador: [servicio.usuario.nombre, servicio.usuario.apellido]
        .filter(Boolean)
        .join(' '),
      categoria: servicio.categoria,
      descripcion: servicio.descripcion,
      disponibilidades: (servicio.disponibilidades ?? []).map((d) =>
        DisponibilidadResponseDto.fromEntity(d),
      ),
    };
  }
}
