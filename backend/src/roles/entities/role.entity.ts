import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RoleName } from '../../common/enums/role-name.enum';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  idRol: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: RoleName;
}
