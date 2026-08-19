import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaDisponibilidadesVeterinaria1785500000000
  implements MigrationInterface
{
  name = 'CrearTablaDisponibilidadesVeterinaria1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "disponibilidades_veterinaria" ("id_disponibilidad" SERIAL NOT NULL, "id_veterinario" integer NOT NULL, "dia_semana" character varying(20) NOT NULL, "hora_inicio" TIME NOT NULL, "hora_fin" TIME NOT NULL, CONSTRAINT "PK_disponibilidades_veterinaria_id_disponibilidad" PRIMARY KEY ("id_disponibilidad"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_disponibilidades_veterinaria_veterinario" ON "disponibilidades_veterinaria" ("id_veterinario")`,
    );
    await queryRunner.query(
      `ALTER TABLE "disponibilidades_veterinaria" ADD CONSTRAINT "FK_disponibilidades_veterinaria_veterinario" FOREIGN KEY ("id_veterinario") REFERENCES "veterinarios"("id_veterinario") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "disponibilidades_veterinaria" DROP CONSTRAINT "FK_disponibilidades_veterinaria_veterinario"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_disponibilidades_veterinaria_veterinario"`,
    );
    await queryRunner.query(`DROP TABLE "disponibilidades_veterinaria"`);
  }
}
