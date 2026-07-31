import { ClinicalEventType } from '../../common/enums/clinical-event-type.enum';
import { EventoClinico } from '../entities/evento-clinico.entity';

export class EventoClinicoResponseDto {
  idEvento: number;
  idHistoria: number;
  idMascota: number;
  idVeterinario: number;
  tipo: ClinicalEventType;
  fecha: string;
  descripcion: string;
  diagnostico: string | null;
  tratamiento: string | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(evento: EventoClinico): EventoClinicoResponseDto {
    return {
      idEvento: evento.idEvento,
      idHistoria: evento.historia.idHistoria,
      idMascota: evento.historia.mascota.idMascota,
      idVeterinario: evento.veterinario.idVeterinario,
      tipo: evento.tipo,
      fecha: evento.fecha,
      descripcion: evento.descripcion,
      diagnostico: evento.diagnostico,
      tratamiento: evento.tratamiento,
      observaciones: evento.observaciones,
      createdAt: evento.createdAt,
      updatedAt: evento.updatedAt,
    };
  }
}
