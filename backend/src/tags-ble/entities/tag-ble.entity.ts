import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Mascota } from '../../mascotas/entities/mascota.entity';

/**
 * Tag BLE (Eddystone-UID) vinculado al perfil de una mascota (US-32).
 *
 * `tagId` es el instance ID del frame Eddystone-UID: 12 caracteres hex en
 * mayúscula, sin separadores. Tiene que coincidir exactamente con lo que
 * emite el tag físico, porque es el mismo valor que usa el contrato de
 * detección (US-30/US-31) para saber a qué mascota corresponde una lectura.
 */
@Entity('tags_ble')
export class TagBle {
  @PrimaryGeneratedColumn({ name: 'id_tag_ble' })
  idTagBle: number;

  @Column({ name: 'tag_id', type: 'varchar', length: 12 })
  tagId: string;

  @OneToOne(() => Mascota, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Mascota;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
