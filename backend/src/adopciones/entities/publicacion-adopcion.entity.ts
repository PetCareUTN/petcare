import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdopcionStatus } from '../../common/enums/adopcion-status.enum';
import { TamanoMascota } from '../../common/enums/tamano-mascota.enum';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Publicación de una mascota en adopción. No transfiere la propiedad de la
 * mascota: solo referencia a la mascota y al dueño que la publica. Los datos
 * básicos (nombre, especie, raza, sexo, edad, foto) se leen de la mascota
 * asociada; los atributos propios de la publicación (tamaño, vacunación,
 * compatibilidad, ubicación) viven acá porque son específicos del proceso de
 * adopción, no del registro médico de la mascota.
 */
@Entity('publicaciones_adopcion')
export class PublicacionAdopcion {
  @PrimaryGeneratedColumn({ name: 'id_publicacion' })
  idPublicacion: number;

  @ManyToOne(() => Mascota, { nullable: false })
  @JoinColumn({ name: 'id_mascota' })
  mascota: Mascota;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar', length: 20, default: AdopcionStatus.ACTIVA })
  estado: AdopcionStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tamano: TamanoMascota | null;

  @Column({ type: 'boolean', default: false })
  vacunado: boolean;

  @Column({ name: 'compatible_perros', type: 'boolean', default: false })
  compatiblePerros: boolean;

  @Column({ name: 'compatible_gatos', type: 'boolean', default: false })
  compatibleGatos: boolean;

  @Column({ name: 'compatible_ninos', type: 'boolean', default: false })
  compatibleNinos: boolean;

  @Column({ name: 'necesita_patio', type: 'boolean', default: false })
  necesitaPatio: boolean;

  @Column({ type: 'varchar', length: 150, nullable: true })
  ubicacion: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
