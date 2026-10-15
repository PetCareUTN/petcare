import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CategoriaServicio } from '../../common/enums/categoria-servicio.enum';
import { User } from '../../users/entities/user.entity';
import { DisponibilidadServicio } from './disponibilidad-servicio.entity';

@Entity('servicios')
export class Servicio {
  @PrimaryGeneratedColumn({ name: 'id_servicio' })
  idServicio: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @Column({ type: 'varchar', length: 20 })
  categoria: CategoriaServicio;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @OneToMany(
    () => DisponibilidadServicio,
    (disponibilidad) => disponibilidad.servicio,
    { cascade: true, eager: true, orphanedRowAction: 'delete' },
  )
  disponibilidades: DisponibilidadServicio[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
