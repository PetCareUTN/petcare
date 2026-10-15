import { EventoClinico } from '../entities/evento-clinico.entity';
import { HistoriaClinica } from '../../historias-clinicas/entities/historia-clinica.entity';
import { EventoClinicoResponseDto } from './evento-clinico-response.dto';

export class HistoriaClinicaResponseDto {
  idHistoria: number | null;
  idMascota: number;
  fechaCreacion: Date | null;
  eventos: EventoClinicoResponseDto[];

  static fromEntity(
    historia: HistoriaClinica,
    idMascota: number,
    eventos: EventoClinico[],
  ): HistoriaClinicaResponseDto {
    const dto = new HistoriaClinicaResponseDto();
    dto.idHistoria = historia.idHistoria;
    dto.idMascota = idMascota;
    dto.fechaCreacion = historia.fechaCreacion;
    dto.eventos = eventos.map((evento) => EventoClinicoResponseDto.fromEntity(evento));
    return dto;
  }

  static vacia(idMascota: number): HistoriaClinicaResponseDto {
    const dto = new HistoriaClinicaResponseDto();
    dto.idHistoria = null;
    dto.idMascota = idMascota;
    dto.fechaCreacion = null;
    dto.eventos = [];
    return dto;
  }
}
