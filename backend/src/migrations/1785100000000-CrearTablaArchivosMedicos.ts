import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaArchivosMedicos1785100000000 implements MigrationInterface {
  name = 'CrearTablaArchivosMedicos1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "archivos_medicos" (
        "id_archivo" SERIAL NOT NULL,
        "id_evento" integer NOT NULL,
        "nombre_original" character varying(255) NOT NULL,
        "nombre_archivo" character varying(255) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "tamano_bytes" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_archivos_medicos_id_archivo" PRIMARY KEY ("id_archivo")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_archivos_medicos_evento" ON "archivos_medicos" ("id_evento")`,
    );
    await queryRunner.query(
      `ALTER TABLE "archivos_medicos" ADD CONSTRAINT "FK_archivos_medicos_evento" FOREIGN KEY ("id_evento") REFERENCES "eventos_clinicos"("id_evento") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "archivos_medicos" DROP CONSTRAINT "FK_archivos_medicos_evento"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_archivos_medicos_evento"`);
    await queryRunner.query(`DROP TABLE "archivos_medicos"`);
  }
}
