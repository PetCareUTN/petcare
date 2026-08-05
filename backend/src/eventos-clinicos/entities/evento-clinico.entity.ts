import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClinicalEventType } from '../../common/enums/clinical-event-type.enum';
import { HistoriaClinica } from '../../historias-clinicas/entities/historia-clinica.entity';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
