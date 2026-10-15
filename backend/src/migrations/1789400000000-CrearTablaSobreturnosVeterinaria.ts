import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaSobreturnosVeterinaria1789400000000
  implements MigrationInterface
{
  name = 'CrearTablaSobreturnosVeterinaria1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sobreturnos_veterinaria" (
        "id_sobreturno" SERIAL NOT NULL,
        "id_veterinario" integer NOT NULL,
        "fecha" date NOT NULL,
        "hora" time NOT NULL,
        "cupos" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sobreturnos_veterinaria_id_sobreturno" PRIMARY KEY ("id_sobreturno")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_sobreturnos_veterinaria_veterinario_fecha_hora"
      ON "sobreturnos_veterinaria" ("id_veterinario", "fecha", "hora")
    `);
    await queryRunner.query(`
      ALTER TABLE "sobreturnos_veterinaria"
      ADD CONSTRAINT "FK_sobreturnos_veterinaria_veterinario"
      FOREIGN KEY ("id_veterinario") REFERENCES "veterinarios"("id_veterinario")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "sobreturnos_veterinaria" DROP CONSTRAINT "FK_sobreturnos_veterinaria_veterinario"',
    );
    await queryRunner.query(
      'DROP INDEX "UQ_sobreturnos_veterinaria_veterinario_fecha_hora"',
    );
    await queryRunner.query('DROP TABLE "sobreturnos_veterinaria"');
  }
}
