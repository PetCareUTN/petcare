import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarCuposPorTurnoADisponibilidadesVeterinaria1787300000000
  implements MigrationInterface
{
  name = 'AgregarCuposPorTurnoADisponibilidadesVeterinaria1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "disponibilidades_veterinaria" ADD "cupos_por_turno" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "disponibilidades_veterinaria" DROP COLUMN "cupos_por_turno"`,
    );
  }
}
