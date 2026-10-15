import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventoClinico } from './evento-clinico.entity';

@Entity('archivos_medicos')
export class ArchivoMedico {
  @PrimaryGeneratedColumn({ name: 'id_archivo' })
  idArchivo: number;

  @ManyToOne(() => EventoClinico, (evento) => evento.archivosMedicos, {
    nullable: false,
  })
  @JoinColumn({ name: 'id_evento' })
  evento: EventoClinico;

  @Column({ name: 'nombre_original', type: 'varchar', length: 255 })
  nombreOriginal: string;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'tamano_bytes', type: 'integer' })
  tamanoBytes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
