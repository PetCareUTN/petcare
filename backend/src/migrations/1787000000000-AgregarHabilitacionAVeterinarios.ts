import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarHabilitacionAVeterinarios1787000000000
  implements MigrationInterface
{
  name = 'AgregarHabilitacionAVeterinarios1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "veterinarios" ADD "habilitacion_url" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "veterinarios" DROP COLUMN "habilitacion_url"`,
    );
  }
}
