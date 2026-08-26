import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { User } from '../../users/entities/user.entity';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';

export type CanceladoPor = 'dueño' | 'veterinario';

@Entity('turnos_veterinarios')
export class TurnoVeterinario {
  @PrimaryGeneratedColumn({ name: 'id_turno' })
  idTurno: number;

  @ManyToOne(() => Veterinario, { nullable: false })
  @JoinColumn({ name: 'id_veterinario' })
  veterinario: Veterinario;

  @ManyToOne(() => Mascota, { nullable: false })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Mascota;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id_duenio' })
  duenio: User;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time' })
  hora: string;

  @Column({ name: 'motivo_consulta', type: 'text', nullable: true })
  motivoConsulta: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: AppointmentStatus.PENDIENTE,
  })
  estado: AppointmentStatus;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;

  @Column({ name: 'cancelado_por', type: 'varchar', length: 20, nullable: true })
  canceladoPor: CanceladoPor | null;

  @Column({ name: 'motivo_cancelacion', type: 'text', nullable: true })
  motivoCancelacion: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
