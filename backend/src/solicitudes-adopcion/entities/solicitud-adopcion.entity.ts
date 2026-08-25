import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SolicitudAdopcionEstado } from '../../common/enums/solicitud-adopcion-estado.enum';
import { PublicacionAdopcion } from '../../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../../users/entities/user.entity';

@Entity('solicitudes_adopcion')
export class SolicitudAdopcion {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud: number;

  @ManyToOne(() => PublicacionAdopcion, { nullable: false })
  @JoinColumn({ name: 'id_publicacion' })
  publicacion: PublicacionAdopcion;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id_usuario_solicitante' })
  solicitante: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: SolicitudAdopcionEstado.PENDIENTE,
  })
  estado: SolicitudAdopcionEstado;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
