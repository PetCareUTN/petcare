import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarCamposRecuperacionPassword1785000000000
  implements MigrationInterface
{
  name = 'AgregarCamposRecuperacionPassword1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "codigo_recuperacion" character varying(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "fecha_expiracion_codigo" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN "fecha_expiracion_codigo"
    `);

    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN "codigo_recuperacion"
    `);
  }
}