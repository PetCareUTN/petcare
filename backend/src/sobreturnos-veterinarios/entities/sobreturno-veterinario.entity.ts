import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';

/**
 * Cupo extra que un veterinario agrega para una fecha y hora puntuales,
 * por fuera de su disponibilidad semanal recurrente.
 *
 * Se suma a la capacidad normal de esa hora (si la hay) al calcular los
 * horarios disponibles y al validar una reserva; también puede abrir un
 * horario que no está dentro de ninguna franja habitual.
 */
@Entity('sobreturnos_veterinaria')
export class SobreturnoVeterinario {
  @PrimaryGeneratedColumn({ name: 'id_sobreturno' })
  idSobreturno: number;

  @ManyToOne(() => Veterinario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_veterinario' })
  veterinario: Veterinario;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time' })
  hora: string;

  @Column({ type: 'int', default: 1 })
  cupos: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
