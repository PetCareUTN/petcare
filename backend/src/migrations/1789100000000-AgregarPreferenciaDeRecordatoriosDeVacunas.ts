import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarPreferenciaDeRecordatoriosDeVacunas1789100000000
  implements MigrationInterface
{
  name = 'AgregarPreferenciaDeRecordatoriosDeVacunas1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // NOT NULL con default true: los usuarios que ya existen quedan con los
    // recordatorios activados, que es el comportamiento que plantea la historia.
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD "recordatorios_vacunas" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN "recordatorios_vacunas"`,
    );
  }
}
