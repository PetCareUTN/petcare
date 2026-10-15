import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SolicitudAdopcionEstado } from '../../common/enums/solicitud-adopcion-estado.enum';
import { TipoVivienda } from '../../common/enums/tipo-vivienda.enum';
import { PublicacionAdopcion } from '../../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../../users/entities/user.entity';

@Entity('solicitudes_adopcion')
export class SolicitudAdopcion {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud: number;

  @ManyToOne(() => PublicacionAdopcion, { nullable: false })
  @JoinColumn({ name: 'id_publicacion' })
  publicacion: PublicacionAdopcion;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'id_usuario_solicitante' })
  solicitante: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: SolicitudAdopcionEstado.PENDIENTE,
  })
  estado: SolicitudAdopcionEstado;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;

  // Respuestas del formulario "Contanos un poco sobre vos", para que el
  // dueño pueda evaluar la solicitud antes de aceptarla.
  @Column({ name: 'tipo_vivienda', type: 'varchar', length: 20, nullable: true })
  tipoVivienda: TipoVivienda | null;

  @Column({ name: 'tiene_patio', type: 'boolean', nullable: true })
  tienePatio: boolean | null;

  @Column({ name: 'tiene_otras_mascotas', type: 'boolean', nullable: true })
  tieneOtrasMascotas: boolean | null;

  @Column({ name: 'tiene_ninos', type: 'boolean', nullable: true })
  tieneNinos: boolean | null;

  @Column({ name: 'tuvo_mascotas_antes', type: 'boolean', nullable: true })
  tuvoMascotasAntes: boolean | null;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ name: 'informacion_adicional', type: 'text', nullable: true })
  informacionAdicional: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
