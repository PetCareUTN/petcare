import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('documentos_prestadores')
export class DocumentoPrestador {
  @PrimaryGeneratedColumn() id: number;
  @Column() idSolicitud: number;
  @Column({ type: 'varchar', length: 20 }) tipo: 'identidad' | 'evidencia';
  @Column({ type: 'varchar', length: 30 }) mime: string;
  @Column({ type: 'bytea', select: false }) contenido: Buffer;
  @Column({ type: 'timestamptz' }) vence: Date;
}
