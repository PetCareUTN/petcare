import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Dispositivo donde una persona quiere recibir notificaciones push.
 *
 * El token lo emite FCM en el celular y cambia solo (reinstalación, borrado de
 * datos, el propio FCM lo rota), así que la app lo vuelve a registrar en cada
 * inicio de sesión y acá se guarda el último.
 *
 * El token es único en toda la tabla, no por usuario: si dos cuentas inician
 * sesión en el mismo teléfono, el token pasa a la última, que es la que está
 * usando el aparato. Sin eso, la cuenta vieja seguiría recibiendo los avisos de
 * alguien que ya no es quien tiene el celular en la mano.
 */
@Entity('dispositivos_push')
export class DispositivoPush {
  @PrimaryGeneratedColumn({ name: 'id_dispositivo' })
  idDispositivo: number;

  @ManyToOne(() => User, { eager: false, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  /** Registration token de FCM. */
  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  /** Hoy solo hay app Android, pero el canal no depende de eso. */
  @Column({ type: 'varchar', length: 20, default: 'android' })
  plataforma: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
