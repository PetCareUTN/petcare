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
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Publicación de una mascota en adopción. No transfiere la propiedad de la
 * mascota: solo referencia a la mascota y al dueño que la publica. Los datos
 * visibles (incluida la foto) se leen de la mascota asociada.
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
