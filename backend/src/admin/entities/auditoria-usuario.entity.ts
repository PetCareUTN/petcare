import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('auditoria_usuarios')
export class AuditoriaUsuario {
  @PrimaryGeneratedColumn({ name: 'id_auditoria' })
  idAuditoria: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Column({ name: 'tipo_accion', type: 'varchar', length: 50 })
  tipoAccion: string;

  @Column({ type: 'jsonb', nullable: true })
  detalle: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'fecha_accion' })
  fechaAccion: Date;
}
