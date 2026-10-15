import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DiaSemana } from '../../common/enums/dia-semana.enum';
import { Servicio } from './servicio.entity';

@Entity('disponibilidades_servicio')
export class DisponibilidadServicio {
  @PrimaryGeneratedColumn({ name: 'id_disponibilidad' })
  idDisponibilidad: number;

  @ManyToOne(() => Servicio, (servicio) => servicio.disponibilidades, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_servicio' })
  servicio: Servicio;

  @Column({ name: 'dia_semana', type: 'varchar', length: 20 })
  diaSemana: DiaSemana;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;
}
