import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ValidationStatus } from '../../common/enums/validation-status.enum';
import { EventoClinico } from '../../eventos-clinicos/entities/evento-clinico.entity';
import { User } from '../../users/entities/user.entity';

@Entity('veterinarios')
export class Veterinario {
  @PrimaryGeneratedColumn({ name: 'id_veterinario' })
  idVeterinario: number;

  @OneToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  usuario: User;

  @Column({ type: 'varchar', length: 30, name: 'numero_documento' })
  numeroDocumento: string;

  @Column({ type: 'varchar', length: 50, name: 'numero_matricula' })
  numeroMatricula: string;

  @Column({ type: 'varchar', length: 100, name: 'provincia_matricula' })
  provinciaMatricula: string;

  @Column({ type: 'text', name: 'matricula_url' })
  matriculaUrl: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'estado_validacion',
    default: ValidationStatus.PENDIENTE,
  })
  estadoValidacion: ValidationStatus;

  @Column({ type: 'text', name: 'motivo_rechazo', nullable: true })
  motivoRechazo: string | null;

  @OneToMany(() => EventoClinico, (eventoClinico) => eventoClinico.veterinario)
  eventosClinicos: EventoClinico[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
