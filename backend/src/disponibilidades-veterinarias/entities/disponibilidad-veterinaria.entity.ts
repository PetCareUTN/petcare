import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DiaSemana } from '../../common/enums/dia-semana.enum';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';

@Entity('disponibilidades_veterinaria')
export class DisponibilidadVeterinaria {
  @PrimaryGeneratedColumn({ name: 'id_disponibilidad' })
  idDisponibilidad: number;

  @ManyToOne(() => Veterinario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_veterinario' })
  veterinario: Veterinario;

  @Column({ name: 'dia_semana', type: 'varchar', length: 20 })
  diaSemana: DiaSemana;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ name: 'cupos_por_turno', type: 'int', default: 1 })
  cuposPorTurno: number;
}
