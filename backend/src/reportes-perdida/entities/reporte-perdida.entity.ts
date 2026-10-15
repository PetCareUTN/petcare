import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReportePerdidaEstado } from '../../common/enums/reporte-perdida-estado.enum';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Reporte de mascota perdida. El estado "perdida" de una mascota no se guarda
 * como columna en `mascotas`: se deriva de tener un reporte en estado ACTIVO,
 * para que no puedan quedar desincronizados. Un índice parcial único garantiza
 * un solo reporte activo por mascota (ver la migración).
 */
@Entity('reportes_perdida')
export class ReportePerdida {
  @PrimaryGeneratedColumn({ name: 'id_reporte' })
  idReporte: number;

  @ManyToOne(() => Mascota, { eager: false, nullable: false })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Mascota;

  /** Dueño que hizo el reporte. Es el único que puede cerrarlo. */
  @ManyToOne(() => User, { eager: false, nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @Column({ type: 'varchar', length: 20, default: ReportePerdidaEstado.ACTIVO })
  estado: ReportePerdidaEstado;

  /** Fecha y hora en que el dueño vio a la mascota por última vez. */
  @Column({ name: 'fecha_perdida', type: 'timestamp' })
  fechaPerdida: Date;

  /** Última ubicación conocida por el dueño, marcada en el mapa de la app. */
  @Column({ type: 'double precision' })
  latitud: number;

  @Column({ type: 'double precision' })
  longitud: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  /** Cómo contactar al dueño si alguien encuentra a la mascota. */
  @Column({ type: 'varchar', length: 150, nullable: true })
  contacto: string | null;

  @Column({ name: 'fecha_cierre', type: 'timestamp', nullable: true })
  fechaCierre: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
