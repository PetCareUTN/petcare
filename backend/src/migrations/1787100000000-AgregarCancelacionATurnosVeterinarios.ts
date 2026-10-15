import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarCancelacionATurnosVeterinarios1787100000000
  implements MigrationInterface
{
  name = 'AgregarCancelacionATurnosVeterinarios1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "turnos_veterinarios" ADD "cancelado_por" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "turnos_veterinarios" ADD "motivo_cancelacion" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "turnos_veterinarios" DROP COLUMN "motivo_cancelacion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "turnos_veterinarios" DROP COLUMN "cancelado_por"`,
    );
  }
}
