import { MigrationInterface, QueryRunner } from 'typeorm';

export class VeterinariaRegistro1784600000000 implements MigrationInterface {
  name = 'VeterinariaRegistro1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" ALTER COLUMN "apellido" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "direccion" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "direccion"`);
    await queryRunner.query(
      `ALTER TABLE "usuarios" ALTER COLUMN "apellido" SET NOT NULL`,
    );
  }
}
