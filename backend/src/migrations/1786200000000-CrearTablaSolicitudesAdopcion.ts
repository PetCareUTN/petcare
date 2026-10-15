import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaSolicitudesAdopcion1786200000000
  implements MigrationInterface
{
  name = 'CrearTablaSolicitudesAdopcion1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "solicitudes_adopcion" (
        "id_solicitud" SERIAL NOT NULL,
        "id_publicacion" integer NOT NULL,
        "id_usuario_solicitante" integer NOT NULL,
        "estado" character varying(20) NOT NULL DEFAULT 'PENDIENTE',
        "motivo_rechazo" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_solicitudes_adopcion_id_solicitud" PRIMARY KEY ("id_solicitud")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_solicitudes_adopcion_publicacion" ON "solicitudes_adopcion" ("id_publicacion")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_solicitudes_adopcion_solicitante" ON "solicitudes_adopcion" ("id_usuario_solicitante")',
    );
    // Evita mas de una solicitud pendiente del mismo usuario sobre la misma publicacion.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_solicitudes_adopcion_pendiente"
      ON "solicitudes_adopcion" ("id_publicacion", "id_usuario_solicitante")
      WHERE "estado" = 'PENDIENTE'
    `);
    await queryRunner.query(`
      ALTER TABLE "solicitudes_adopcion"
      ADD CONSTRAINT "FK_solicitudes_adopcion_publicacion"
      FOREIGN KEY ("id_publicacion") REFERENCES "publicaciones_adopcion"("id_publicacion")
    `);
    await queryRunner.query(`
      ALTER TABLE "solicitudes_adopcion"
      ADD CONSTRAINT "FK_solicitudes_adopcion_solicitante"
      FOREIGN KEY ("id_usuario_solicitante") REFERENCES "usuarios"("id_usuario")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "solicitudes_adopcion" DROP CONSTRAINT "FK_solicitudes_adopcion_solicitante"',
    );
    await queryRunner.query(
      'ALTER TABLE "solicitudes_adopcion" DROP CONSTRAINT "FK_solicitudes_adopcion_publicacion"',
    );
    await queryRunner.query('DROP INDEX "UQ_solicitudes_adopcion_pendiente"');
    await queryRunner.query(
      'DROP INDEX "IDX_solicitudes_adopcion_solicitante"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_solicitudes_adopcion_publicacion"',
    );
    await queryRunner.query('DROP TABLE "solicitudes_adopcion"');
  }
}
