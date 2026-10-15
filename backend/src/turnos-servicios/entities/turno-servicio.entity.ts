import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TurnoServicioEstado } from '../../common/enums/turno-servicio-estado.enum';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { Servicio } from '../../servicios/entities/servicio.entity';
import { User } from '../../users/entities/user.entity';

export type CanceladoPor = 'dueño' | 'prestador';

@Entity('turnos_servicios')
export class TurnoServicio {
  @PrimaryGeneratedColumn({ name: 'id_turno' })
  idTurno: number;

  @ManyToOne(() => Servicio, { nullable: false })
  @JoinColumn({ name: 'id_servicio' })
  servicio: Servicio;

  @ManyToOne(() => Mascota, { nullable: false })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Mascota;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id_duenio' })
  duenio: User;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ type: 'text', nullable: true })
  notas: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: TurnoServicioEstado.CONFIRMADO,
  })
  estado: TurnoServicioEstado;

  @Column({ name: 'cancelado_por', type: 'varchar', length: 20, nullable: true })
  canceladoPor: CanceladoPor | null;

  @Column({ name: 'motivo_cancelacion', type: 'text', nullable: true })
  motivoCancelacion: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
