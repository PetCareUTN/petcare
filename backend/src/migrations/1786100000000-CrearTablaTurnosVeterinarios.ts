import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaTurnosVeterinarios1786100000000
  implements MigrationInterface
{
  name = 'CrearTablaTurnosVeterinarios1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "turnos_veterinarios" (
        "id_turno" SERIAL NOT NULL,
        "id_veterinario" integer NOT NULL,
        "id_mascota" integer NOT NULL,
        "id_duenio" integer NOT NULL,
        "fecha" date NOT NULL,
        "hora" time NOT NULL,
        "motivo_consulta" text,
        "estado" character varying(20) NOT NULL DEFAULT 'pendiente',
        "motivo_rechazo" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_turnos_veterinarios" PRIMARY KEY ("id_turno")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_turnos_veterinarios_veterinario_estado" ON "turnos_veterinarios" ("id_veterinario", "estado")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_turnos_veterinarios_fecha_hora" ON "turnos_veterinarios" ("fecha", "hora")',
    );
    await queryRunner.query(`
      ALTER TABLE "turnos_veterinarios"
      ADD CONSTRAINT "FK_turnos_veterinarios_veterinario"
      FOREIGN KEY ("id_veterinario") REFERENCES "veterinarios"("id_veterinario")
    `);
    await queryRunner.query(`
      ALTER TABLE "turnos_veterinarios"
      ADD CONSTRAINT "FK_turnos_veterinarios_mascota"
      FOREIGN KEY ("id_mascota") REFERENCES "mascotas"("id_mascota")
    `);
    await queryRunner.query(`
      ALTER TABLE "turnos_veterinarios"
      ADD CONSTRAINT "FK_turnos_veterinarios_duenio"
      FOREIGN KEY ("id_duenio") REFERENCES "usuarios"("id_usuario")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "turnos_veterinarios" DROP CONSTRAINT "FK_turnos_veterinarios_duenio"',
    );
    await queryRunner.query(
      'ALTER TABLE "turnos_veterinarios" DROP CONSTRAINT "FK_turnos_veterinarios_mascota"',
    );
    await queryRunner.query(
      'ALTER TABLE "turnos_veterinarios" DROP CONSTRAINT "FK_turnos_veterinarios_veterinario"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_turnos_veterinarios_fecha_hora"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_turnos_veterinarios_veterinario_estado"',
    );
    await queryRunner.query('DROP TABLE "turnos_veterinarios"');
  }
}
