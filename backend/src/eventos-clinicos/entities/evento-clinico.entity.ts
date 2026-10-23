import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClinicalEventType } from '../../common/enums/clinical-event-type.enum';
import { TipoVacuna } from '../../common/enums/tipo-vacuna.enum';
import { HistoriaClinica } from '../../historias-clinicas/entities/historia-clinica.entity';
import { TurnoVeterinario } from '../../turnos-veterinarios/entities/turno-veterinario.entity';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';
import { ArchivoMedico } from './archivo-medico.entity';

@Entity('eventos_clinicos')
export class EventoClinico {
  @PrimaryGeneratedColumn({ name: 'id_evento' })
  idEvento: number;

  @ManyToOne(() => HistoriaClinica, (historia) => historia.eventosClinicos, {
    nullable: false,
  })
  @JoinColumn({ name: 'id_historia' })
  historia: HistoriaClinica;

  @ManyToOne(() => Veterinario, (veterinario) => veterinario.eventosClinicos, {
    nullable: false,
  })
  @JoinColumn({ name: 'id_veterinario' })
  veterinario: Veterinario;

  /**
   * Turno del que salió esta atención, si vino de uno (P1-193).
   *
   * Es nullable porque una urgencia puede atenderse sin reserva previa. Cuando
   * está cargado, es lo que permite dar el turno por asistido sin que el
   * veterinario tenga que marcarlo aparte.
   */
  @ManyToOne(() => TurnoVeterinario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_turno' })
  turno: TurnoVeterinario | null;

  @Column({ type: 'varchar', length: 50 })
  tipo: ClinicalEventType;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  diagnostico: string | null;

  @Column({ type: 'text', nullable: true })
  tratamiento: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  /*
   * Campos de vacunación (US-40). Son nullable porque solo aplican cuando
   * `tipo` es VACUNA; el resto de los eventos clínicos los deja en null.
   */

  /** Qué vacuna es. Obligatoria cuando el evento es de tipo vacuna. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  vacuna: TipoVacuna | null;

  /**
   * Fecha de la próxima dosis, cargada por el veterinario.
   *
   * Es el corazón de US-40: el recordatorio no calcula nada, solo busca las fechas
   * que se acercan. Se carga a mano y no se prellena a propósito, porque el
   * intervalo depende del animal — un cachorro recibe varias dosis separadas por
   * semanas antes de pasar al esquema anual.
   */
  @Column({ name: 'proxima_aplicacion', type: 'date', nullable: true })
  proximaAplicacion: string | null;

  /**
   * Cuándo se le avisó al dueño de esta dosis.
   *
   * Evita que la tarea diaria mande la misma notificación todos los días durante
   * toda la ventana de anticipación.
   */
  @Column({
    name: 'recordatorio_enviado_at',
    type: 'timestamp',
    nullable: true,
  })
  recordatorioEnviadoAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ArchivoMedico, (archivo) => archivo.evento)
  archivosMedicos: ArchivoMedico[];
}
