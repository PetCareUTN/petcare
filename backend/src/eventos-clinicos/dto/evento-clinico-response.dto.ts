import { ClinicalEventType } from '../../common/enums/clinical-event-type.enum';
import { TipoVacuna } from '../../common/enums/tipo-vacuna.enum';
import { EventoClinico } from '../entities/evento-clinico.entity';
import { ArchivoMedicoResponseDto } from './archivo-medico-response.dto';

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
  /** Solo en eventos de tipo vacuna (US-40); null en el resto. */
  vacuna: TipoVacuna | null;
  proximaAplicacion: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivos: ArchivoMedicoResponseDto[];

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
      vacuna: evento.vacuna,
      proximaAplicacion: evento.proximaAplicacion,
      createdAt: evento.createdAt,
      updatedAt: evento.updatedAt,
      archivos: (evento.archivosMedicos ?? []).map((archivo) =>
        ArchivoMedicoResponseDto.fromEntity(archivo, evento.idEvento),
      ),
    };
  }
}
