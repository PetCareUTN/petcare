import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PetSex } from '../../common/enums/pet-sex.enum';
import { HistoriaClinica } from '../../historias-clinicas/entities/historia-clinica.entity';
import { User } from '../../users/entities/user.entity';

@Entity('mascotas')
export class Mascota {
  @PrimaryGeneratedColumn({ name: 'id_mascota' })
  idMascota: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'id_historia', type: 'integer', nullable: true })
  idHistoria: number | null;

  @Column({ type: 'varchar', length: 50 })
  especie: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  raza: string | null;

  @Column({ type: 'varchar', length: 20 })
  sexo: PetSex;

  @Column({ name: 'fecha_nacimiento', type: 'date', nullable: true })
  fechaNacimiento: string | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  peso: string | null;

  @Column({ type: 'boolean', default: false })
  esterilizado: boolean;

  @Column({ type: 'text', nullable: true })
  foto: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ type: 'text', nullable: true })
  alergias: string | null;

  @ManyToMany(() => User, (user) => user.mascotas)
  @JoinTable({
    name: 'usuarios_mascotas',
    joinColumn: {
      name: 'id_mascota',
      referencedColumnName: 'idMascota',
    },
    inverseJoinColumn: {
      name: 'id_usuario',
      referencedColumnName: 'idUsuario',
    },
  })
  usuarios: User[];

  @OneToOne(() => HistoriaClinica, (historiaClinica) => historiaClinica.mascota, {
    nullable: true,
  })
  @JoinColumn({ name: 'id_historia' })
  historiaClinica: HistoriaClinica | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
