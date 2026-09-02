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

  @Column({ name: 'numero_documento', type: 'varchar', length: 20, nullable: true, unique: true })
  numeroDocumento: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion: string | null;

  // Null en las cuentas creadas con Google: no tienen contraseña propia.
  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  // "sub" del token de Google: identifica la cuenta aunque cambie de email.
  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true, unique: true })
  googleId: string | null;

  @CreateDateColumn({ name: 'fecha_registro' })
  fechaRegistro: Date;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @Column({
    name: 'id_veterinario_alta_asistida',
    type: 'int',
    nullable: true,
  })
  idVeterinarioAltaAsistida: number | null;

  @ManyToOne(() => Role, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_rol' })
  rol: Role;

  @ManyToMany(() => Mascota, (mascota) => mascota.usuarios)
  mascotas: Mascota[];

  @OneToOne(() => Veterinario, (veterinario) => veterinario.usuario)
  veterinario?: Veterinario;

  @Column({
    name: 'codigo_recuperacion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  codigoRecuperacion: string | null;

  @Column({
    name: 'fecha_expiracion_codigo',
    type: 'timestamp',
    nullable: true,
  })
  fechaExpiracionCodigo: Date | null;

  @Column({
    name: 'email_nuevo',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  emailNuevo: string | null;

  @Column({
    name: 'codigo_cambio_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  codigoCambioEmail: string | null;

  @Column({
    name: 'fecha_expiracion_codigo_email',
    type: 'timestamp',
    nullable: true,
  })
  fechaExpiracionCodigoEmail: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
