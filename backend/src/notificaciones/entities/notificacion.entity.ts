import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../../common/enums/notification-type.enum';
import { User } from '../../users/entities/user.entity';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn({ name: 'id_notificacion' })
  idNotificacion: number;

  @ManyToOne(() => User, { eager: false, nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @Column({ type: 'varchar', length: 50 })
  tipo: NotificationType;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ type: 'text' })
  cuerpo: string;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  /**
   * Registro al que apunta la notificación, para poder abrir la pantalla que
   * corresponde al tocarla (US-41). Qué representa depende de `tipo`: en
   * `mascota_detectada` es el id del reporte de pérdida.
   */
  @Column({ name: 'id_referencia', type: 'integer', nullable: true })
  idReferencia: number | null;

  @CreateDateColumn({ name: 'fecha_envio' })
  fechaEnvio: Date;
}
