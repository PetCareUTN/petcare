import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CategoriaServicio } from '../../common/enums/categoria-servicio.enum';

export type EstadoPrestador =
  'pendiente' | 'correccion' | 'aprobado' | 'rechazado' | 'suspendido';
export interface RevisionPrestador {
  estado: EstadoPrestador;
  motivo: string;
  idAdmin: number | null;
  fecha: string;
}

@Entity('solicitudes_prestadores')
@Unique(['idUsuario', 'categoria'])
export class SolicitudPrestador {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'id_usuario' }) idUsuario: number;
  @Column({ type: 'varchar', length: 20 }) categoria: CategoriaServicio;
  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: EstadoPrestador;
  @Column({ type: 'jsonb' }) datos: {
    nombreCompleto: string;
    numeroDocumento: string;
    telefono: string;
    experiencia: string;
    referencias: string;
    protocolo: string;
    direccion: string;
    capacidad: number | null;
  };
  @Column({ default: false }) identidadRevisada: boolean;
  @Column({ default: false }) contactoVerificado: boolean;
  @Column({ default: false }) referenciasComprobadas: boolean;
  // Resultado de geocodificar `datos.direccion` (Google Geocoding API).
  // Quedan en NULL si la dirección no pudo geocodificarse.
  @Column({ type: 'double precision', nullable: true }) latitud: number | null;
  @Column({ type: 'double precision', nullable: true }) longitud: number | null;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  historial: RevisionPrestador[];
  @Column({ type: 'timestamptz', default: () => 'now()' }) actualizada: Date;
}
