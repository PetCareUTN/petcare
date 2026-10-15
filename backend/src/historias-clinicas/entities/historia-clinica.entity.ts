import {
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventoClinico } from '../../eventos-clinicos/entities/evento-clinico.entity';
import { Mascota } from '../../mascotas/entities/mascota.entity';

@Entity('historias_clinicas')
export class HistoriaClinica {
  @PrimaryGeneratedColumn({ name: 'id_historia' })
  idHistoria: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @OneToOne(() => Mascota, (mascota) => mascota.historiaClinica)
  mascota: Mascota;

  @OneToMany(() => EventoClinico, (eventoClinico) => eventoClinico.historia)
  eventosClinicos: EventoClinico[];
}
