import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaTurnos1785600000000 implements MigrationInterface {
  name = 'CrearTablaTurnos1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "turnos_veterinarios" (
        "id_turno" SERIAL NOT NULL,
        "id_veterinario" integer NOT NULL,
        "id_mascota" integer NOT NULL,
        "id_dueno" integer NOT NULL,
        "fecha" date NOT NULL,
        "hora_inicio" TIME NOT NULL,
        "hora_fin" TIME NOT NULL,
        "estado" character varying(20) NOT NULL DEFAULT 'pendiente',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_turnos_veterinarios_id_turno" PRIMARY KEY ("id_turno")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_turnos_veterinarios_veterinario_fecha" ON "turnos_veterinarios" ("id_veterinario", "fecha")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_turnos_veterinarios_dueno" ON "turnos_veterinarios" ("id_dueno")`,
    );

    await queryRunner.query(`
      ALTER TABLE "turnos_veterinarios"
      ADD CONSTRAINT "FK_turnos_veterinarios_veterinario"
      FOREIGN KEY ("id_veterinario")
      REFERENCES "veterinarios"("id_veterinario")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "turnos_veterinarios"
      ADD CONSTRAINT "FK_turnos_veterinarios_mascota"
      FOREIGN KEY ("id_mascota")
      REFERENCES "mascotas"("id_mascota")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "turnos_veterinarios"
      ADD CONSTRAINT "FK_turnos_veterinarios_dueno"
      FOREIGN KEY ("id_dueno")
      REFERENCES "usuarios"("id_usuario")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "turnos_veterinarios" DROP CONSTRAINT "FK_turnos_veterinarios_dueno"`,
    );
    await queryRunner.query(
      `ALTER TABLE "turnos_veterinarios" DROP CONSTRAINT "FK_turnos_veterinarios_mascota"`,
    );
    await queryRunner.query(
      `ALTER TABLE "turnos_veterinarios" DROP CONSTRAINT "FK_turnos_veterinarios_veterinario"`,
    );
    await queryRunner.query(`DROP TABLE "turnos_veterinarios"`);
  }
}
