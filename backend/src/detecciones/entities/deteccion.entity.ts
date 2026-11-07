import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { ReportePerdida } from '../../reportes-perdida/entities/reporte-perdida.entity';

/**
 * Detección anónima de un tag BLE, reportada por un celular cercano (US-31).
 *
 * **No guarda nada del detector**: ni usuario, ni IP, ni dispositivo. El
 * endpoint es anónimo por diseño y cualquier columna que se agregue acá hay que
 * mirarla dos veces (ver docs/spike-escaneo-ble-segundo-plano.md, punto 5).
 *
 * Se persisten dos tipos de detecciones:
 *
 * - De mascotas perdidas: cuelgan del reporte que estaba abierto al recibirlas.
 *   Eso deja agrupadas las lecturas de cada pérdida y es lo que consulta US-37
 *   (última ubicación conocida).
 * - Preventivas (P1-210): de mascotas sin reporte detectadas fuera de la zona de
 *   casa de sus dueños. No tienen reporte hasta que el dueño la reporta, y si
 *   no lo hace se borran a los 7 días (ver DeteccionesService).
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

  /** Null en las detecciones preventivas de una mascota que no está perdida. */
  @ManyToOne(() => ReportePerdida, {
    eager: false,
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_reporte' })
  reporte: ReportePerdida | null;

  @ManyToOne(() => Mascota, {
    eager: false,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Mascota;

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
