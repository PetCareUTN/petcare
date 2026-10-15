import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaEventosClinicos1784500000000
  implements MigrationInterface
{
  name = 'CrearTablaEventosClinicos1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "historias_clinicas" (
        "id_historia" SERIAL NOT NULL,
        "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_historias_clinicas_id_historia" PRIMARY KEY ("id_historia")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "mascotas" ADD COLUMN IF NOT EXISTS "id_historia" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "mascotas" ADD CONSTRAINT "FK_mascotas_historia_clinica" FOREIGN KEY ("id_historia") REFERENCES "historias_clinicas"("id_historia") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "eventos_clinicos" (
        "id_evento" SERIAL NOT NULL,
        "id_historia" integer NOT NULL,
        "id_veterinario" integer NOT NULL,
        "tipo" character varying(50) NOT NULL,
        "fecha" date NOT NULL,
        "descripcion" text NOT NULL,
        "diagnostico" text,
        "tratamiento" text,
        "observaciones" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_eventos_clinicos_id_evento" PRIMARY KEY ("id_evento")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eventos_clinicos_historia" ON "eventos_clinicos" ("id_historia")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eventos_clinicos_veterinario" ON "eventos_clinicos" ("id_veterinario")`,
    );
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" ADD CONSTRAINT "FK_eventos_clinicos_historia" FOREIGN KEY ("id_historia") REFERENCES "historias_clinicas"("id_historia") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" ADD CONSTRAINT "FK_eventos_clinicos_veterinario" FOREIGN KEY ("id_veterinario") REFERENCES "veterinarios"("id_veterinario") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" DROP CONSTRAINT "FK_eventos_clinicos_veterinario"`,
    );
    await queryRunner.query(
      `ALTER TABLE "eventos_clinicos" DROP CONSTRAINT "FK_eventos_clinicos_historia"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_eventos_clinicos_veterinario"`);
    await queryRunner.query(`DROP INDEX "IDX_eventos_clinicos_historia"`);
    await queryRunner.query(`DROP TABLE "eventos_clinicos"`);
    await queryRunner.query(
      `ALTER TABLE "mascotas" DROP CONSTRAINT "FK_mascotas_historia_clinica"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mascotas" DROP COLUMN IF EXISTS "id_historia"`,
    );
    await queryRunner.query(`DROP TABLE "historias_clinicas"`);
  }
}
