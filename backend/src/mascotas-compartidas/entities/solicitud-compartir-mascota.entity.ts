import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SolicitudCompartirMascotaEstado } from '../../common/enums/solicitud-compartir-mascota-estado.enum';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { User } from '../../users/entities/user.entity';

@Entity('solicitudes_compartir_mascota')
export class SolicitudCompartirMascota {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud: number;

  @ManyToOne(() => Mascota, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Mascota;

  /** Dueño principal que comparte la mascota. */
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario_origen' })
  origen: User;

  /** Persona con la que se quiere compartir. */
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario_destino' })
  destino: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: SolicitudCompartirMascotaEstado.PENDIENTE,
  })
  estado: SolicitudCompartirMascotaEstado;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
