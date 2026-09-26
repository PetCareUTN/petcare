import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Suscripcion } from './suscripcion.entity';

@Entity('pagos_suscripcion')
export class PagoSuscripcion {
  @PrimaryGeneratedColumn({ name: 'id_pago' })
  idPago: number;

  @ManyToOne(() => Suscripcion, { nullable: false })
  @JoinColumn({ name: 'id_suscripcion' })
  suscripcion: Suscripcion;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 3 })
  moneda: string;

  @Column({ type: 'varchar', length: 20 })
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';

  @Column({ type: 'varchar', name: 'mp_payment_id', nullable: true })
  mpPaymentId: string | null;

  @Column({ type: 'varchar', name: 'mp_status', nullable: true })
  mpStatus: string | null;

  @Column({ type: 'timestamptz', name: 'fecha_pago', nullable: true })
  fechaPago: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
