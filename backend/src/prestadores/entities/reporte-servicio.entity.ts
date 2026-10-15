import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('reportes_servicios')
export class ReporteServicio {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) idTurno: number;
  @Column({ type: 'text' }) motivo: string;
  @Column({ type: 'varchar', length: 20, default: 'pendiente' }) estado:
    'pendiente' | 'resuelto';
  @Column({ type: 'text', nullable: true }) resolucion: string | null;
  @Column({ type: 'int', nullable: true }) idAdmin: number | null;
  @Column({ type: 'timestamptz', nullable: true }) resueltoEn: Date | null;
  @Column({ type: 'timestamptz', default: () => 'now()' }) fecha: Date;
}
