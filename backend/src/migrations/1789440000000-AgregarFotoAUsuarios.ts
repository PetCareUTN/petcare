import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarFotoAUsuarios1789440000000 implements MigrationInterface {
  name = 'AgregarFotoAUsuarios1789440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios" ADD COLUMN "foto" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "foto"`);
  }
}
