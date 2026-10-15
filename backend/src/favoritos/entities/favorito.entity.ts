import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PublicacionAdopcion } from '../../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../../users/entities/user.entity';

/** Mascota en adopción que un usuario guardó para ver más tarde. */
@Entity('favoritos')
export class Favorito {
  @PrimaryGeneratedColumn({ name: 'id_favorito' })
  idFavorito: number;

  @ManyToOne(() => PublicacionAdopcion, { nullable: false })
  @JoinColumn({ name: 'id_publicacion' })
  publicacion: PublicacionAdopcion;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
