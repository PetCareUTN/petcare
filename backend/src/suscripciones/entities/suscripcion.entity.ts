import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SuscripcionEstado } from '../../common/enums/suscripcion-estado.enum';
import { User } from '../../users/entities/user.entity';

@Entity('suscripciones')
export class Suscripcion {
  @PrimaryGeneratedColumn({ name: 'id_suscripcion' })
  idSuscripcion: number;

  @OneToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: SuscripcionEstado.PENDIENTE_PAGO,
  })
  estado: SuscripcionEstado;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 1000,
    name: 'monto',
  })
  monto: number;

  @Column({ type: 'varchar', length: 3, default: 'ARS', name: 'moneda' })
  moneda: string;

  @Column({ type: 'varchar', name: 'mp_preapproval_id', nullable: true })
  mpPreapprovalId: string | null;

  @Column({ type: 'timestamptz', name: 'fecha_inicio', nullable: true })
  fechaInicio: Date | null;

  @Column({ type: 'timestamptz', name: 'fecha_fin', nullable: true })
  fechaFin: Date | null;

  @Column({ type: 'timestamptz', name: 'fecha_gracia_inicio', nullable: true })
  fechaGraciaInicio: Date | null;

  @Column({ type: 'timestamptz', name: 'fecha_vencimiento', nullable: true })
  fechaVencimiento: Date | null;

  /** Fin del período de prueba gratuito (null si no hay trial activo). */
  @Column({ type: 'timestamptz', name: 'fecha_prueba_fin', nullable: true })
  fechaPruebaFin: Date | null;

  /**
   * true si ya se usó el período de prueba gratuito.
   * Evita re-activar el trial después de una cancelación o un pago.
   */
  @Column({ name: 'prueba_usada', type: 'boolean', default: false })
  pruebaUsada: boolean;

  /**
   * Si ya se avisó que el período de prueba está por vencer (a 30 días).
   * Igual que graciaNotificada: evita repetir el aviso en cada cron.
   */
  @Column({ name: 'prueba_notificada', type: 'boolean', default: false })
  pruebaNotificada: boolean;

  /**
   * Si ya se avisó que el período de gracia está por vencer.
   *
   * Evita que el cron horario repita el mismo aviso cada hora durante el día
   * de gracia.
   */
  @Column({ name: 'gracia_notificada', type: 'boolean', default: false })
  graciaNotificada: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
