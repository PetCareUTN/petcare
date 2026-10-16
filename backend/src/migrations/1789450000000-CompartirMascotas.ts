import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompartirMascotas1789450000000 implements MigrationInterface {
  name = 'CompartirMascotas1789450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Quién registró la mascota. Es el único que puede compartirla. La tabla
    // `usuarios_mascotas` ya admitía varios dueños por mascota, pero no decía
    // cuál es el principal.
    await queryRunner.query(
      `ALTER TABLE "mascotas" ADD "id_duenio_principal" integer`,
    );
    // Las mascotas que ya existen: el principal es el dueño que se sumó primero.
    await queryRunner.query(`
      UPDATE "mascotas" m
      SET "id_duenio_principal" = (
        SELECT um."id_usuario"
        FROM "usuarios_mascotas" um
        WHERE um."id_mascota" = m."id_mascota"
        ORDER BY um."created_at" ASC, um."id_usuario" ASC
        LIMIT 1
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "mascotas"
      ADD CONSTRAINT "FK_mascotas_duenio_principal"
      FOREIGN KEY ("id_duenio_principal") REFERENCES "usuarios"("id_usuario")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "solicitudes_compartir_mascota" (
        "id_solicitud" SERIAL NOT NULL,
        "id_mascota" integer NOT NULL,
        "id_usuario_origen" integer NOT NULL,
        "id_usuario_destino" integer NOT NULL,
        "estado" character varying(20) NOT NULL DEFAULT 'PENDIENTE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_solicitudes_compartir_mascota" PRIMARY KEY ("id_solicitud")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "solicitudes_compartir_mascota"
      ADD CONSTRAINT "FK_solicitudes_compartir_mascota_mascota"
      FOREIGN KEY ("id_mascota") REFERENCES "mascotas"("id_mascota")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "solicitudes_compartir_mascota"
      ADD CONSTRAINT "FK_solicitudes_compartir_mascota_origen"
      FOREIGN KEY ("id_usuario_origen") REFERENCES "usuarios"("id_usuario")
      ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "solicitudes_compartir_mascota"
      ADD CONSTRAINT "FK_solicitudes_compartir_mascota_destino"
      FOREIGN KEY ("id_usuario_destino") REFERENCES "usuarios"("id_usuario")
      ON DELETE CASCADE
    `);
    // Una sola solicitud pendiente por mascota y destinatario, aunque lleguen
    // dos pedidos a la vez. Las respondidas o canceladas no cuentan.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_solicitudes_compartir_pendiente"
      ON "solicitudes_compartir_mascota" ("id_mascota", "id_usuario_destino")
      WHERE "estado" = 'PENDIENTE'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitudes_compartir_destino_estado"
      ON "solicitudes_compartir_mascota" ("id_usuario_destino", "estado")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_solicitudes_compartir_destino_estado"',
    );
    await queryRunner.query('DROP INDEX "UQ_solicitudes_compartir_pendiente"');
    await queryRunner.query('DROP TABLE "solicitudes_compartir_mascota"');
    await queryRunner.query(
      'ALTER TABLE "mascotas" DROP CONSTRAINT "FK_mascotas_duenio_principal"',
    );
    await queryRunner.query(
      'ALTER TABLE "mascotas" DROP COLUMN "id_duenio_principal"',
    );
  }
}
