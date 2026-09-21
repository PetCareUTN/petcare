import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReportePerdida } from '../../reportes-perdida/entities/reporte-perdida.entity';

/**
 * Detección anónima de un tag BLE, reportada por un celular cercano (US-31).
 *
 * **No guarda nada del detector**: ni usuario, ni IP, ni dispositivo. El
 * endpoint es anónimo por diseño y cualquier columna que se agregue acá hay que
 * mirarla dos veces (ver docs/spike-escaneo-ble-segundo-plano.md, punto 5).
 *
 * Solo se persisten detecciones de mascotas perdidas, así que cada una cuelga
 * del reporte que estaba abierto al recibirla. Eso deja agrupadas las lecturas
 * de cada pérdida y es lo que consulta US-37 (última ubicación conocida).
 */
@Entity('detecciones')
export class Deteccion {
  @PrimaryGeneratedColumn({ name: 'id_deteccion' })
  idDeteccion: number;

  /**
   * UUID v4 generado por el celular, que lo reusa en cada reintento. El índice
   * único sobre esta columna es lo que evita los duplicados.
   */
  @Column({ name: 'deteccion_uuid', type: 'uuid' })
  deteccionUuid: string;

  @ManyToOne(() => ReportePerdida, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_reporte' })
  reporte: ReportePerdida;

  /** Instance ID Eddystone-UID que se leyó, tal como llegó. */
  @Column({ name: 'tag_id', type: 'varchar', length: 12 })
  tagId: string;

  @Column({ type: 'integer' })
  rssi: number;

  /** Redondeada a 3 decimales (~110 m) por el celular antes de enviarla. */
  @Column({ type: 'double precision' })
  latitud: number;

  @Column({ type: 'double precision' })
  longitud: number;

  @Column({ name: 'precision_metros', type: 'integer' })
  precisionMetros: number;

  /** Momento de la lectura según el celular: puede llegar tarde si estuvo sin red. */
  @Column({ name: 'detectado_en', type: 'timestamp' })
  detectadoEn: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
