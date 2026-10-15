import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('resenas_servicios')
export class ResenaServicio {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) idTurno: number;
  @Column({ type: 'smallint' }) puntuacion: number;
  @Column({ type: 'text' }) comentario: string;
  @Column({ type: 'timestamptz', default: () => 'now()' }) fecha: Date;
}
