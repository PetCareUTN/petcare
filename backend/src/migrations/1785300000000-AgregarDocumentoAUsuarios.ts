import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarDocumentoAUsuarios1785300000000 implements MigrationInterface {
  name = 'AgregarDocumentoAUsuarios1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "numero_documento" character varying(20)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_usuarios_numero_documento" ON "usuarios" ("numero_documento") WHERE "numero_documento" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_usuarios_numero_documento"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "numero_documento"`);
  }
}
