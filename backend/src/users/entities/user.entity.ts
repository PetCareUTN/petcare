import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { Role } from '../../roles/entities/role.entity';
import { Veterinario } from '../../veterinarios/entities/veterinario.entity';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  idUsuario: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apellido: string | null;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @ManyToOne(() => Role, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_rol' })
  rol: Role;

  @ManyToMany(() => Mascota, (mascota) => mascota.usuarios)
  mascotas: Mascota[];

  @OneToOne(() => Veterinario, (veterinario) => veterinario.usuario)
  veterinario?: Veterinario;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
