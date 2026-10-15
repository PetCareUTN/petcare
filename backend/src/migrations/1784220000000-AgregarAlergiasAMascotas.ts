import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarAlergiasAMascotas1784220000000 implements MigrationInterface {
  name = 'AgregarAlergiasAMascotas1784220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mascotas" ADD "alergias" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mascotas" DROP COLUMN "alergias"`);
  }
}