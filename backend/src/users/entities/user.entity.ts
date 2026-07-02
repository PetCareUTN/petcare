import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  idUsuario: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  apellido: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @ManyToOne(() => Role, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_rol' })
  rol: Role;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
