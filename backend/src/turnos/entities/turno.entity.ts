import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TurnoEstado } from '../../common/enums/turno-estado.enum';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { User } from '../../users/entities/user.entity';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';

@Entity('turnos_veterinarios')
export class Turno {
  @PrimaryGeneratedColumn({ name: 'id_turno' })
  idTurno: number;

  @ManyToOne(() => Veterinario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_veterinario' })
  veterinario: Veterinario;

  @ManyToOne(() => Mascota, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Mascota;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_dueno' })
  dueno: User;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ type: 'varchar', length: 20, default: TurnoEstado.PENDIENTE })
  estado: TurnoEstado;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
