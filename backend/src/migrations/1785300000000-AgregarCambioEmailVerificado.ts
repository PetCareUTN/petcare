import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarCambioEmailVerificado1785300000000
  implements MigrationInterface
{
  name = 'AgregarCambioEmailVerificado1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "email_nuevo" varchar(150),
      ADD COLUMN "codigo_cambio_email" varchar(255),
      ADD COLUMN "fecha_expiracion_codigo_email" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN "email_nuevo",
      DROP COLUMN "codigo_cambio_email",
      DROP COLUMN "fecha_expiracion_codigo_email"
    `);
  }
}
