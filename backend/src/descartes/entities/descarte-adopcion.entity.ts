import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PublicacionAdopcion } from '../../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../../users/entities/user.entity';

/** Publicación que el usuario pasó en el descubrimiento y no quiere volver a ver. */
@Entity('descartes_adopcion')
export class DescarteAdopcion {
  @PrimaryGeneratedColumn({ name: 'id_descarte' })
  idDescarte: number;

  @ManyToOne(() => PublicacionAdopcion, { nullable: false })
  @JoinColumn({ name: 'id_publicacion' })
  publicacion: PublicacionAdopcion;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
