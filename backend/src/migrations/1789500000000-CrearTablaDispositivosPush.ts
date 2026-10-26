import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaDispositivosPush1789500000000 implements MigrationInterface {
  name = 'CrearTablaDispositivosPush1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dispositivos_push" (
        "id_dispositivo" SERIAL NOT NULL,
        "id_usuario" integer NOT NULL,
        "token" character varying(255) NOT NULL,
        "plataforma" character varying(20) NOT NULL DEFAULT 'android',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dispositivos_push_id_dispositivo" PRIMARY KEY ("id_dispositivo")
      )
    `);
    // Único en toda la tabla y no por usuario: si dos cuentas inician sesión en
    // el mismo teléfono, el token queda para la última (ver la entidad).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_dispositivos_push_token" ON "dispositivos_push" ("token")
    `);
    // El envío busca todos los dispositivos del destinatario.
    await queryRunner.query(`
      CREATE INDEX "IDX_dispositivos_push_usuario" ON "dispositivos_push" ("id_usuario")
    `);
    await queryRunner.query(`
      ALTER TABLE "dispositivos_push"
      ADD CONSTRAINT "FK_dispositivos_push_usuario"
      FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "dispositivos_push" DROP CONSTRAINT "FK_dispositivos_push_usuario"',
    );
    await queryRunner.query('DROP INDEX "IDX_dispositivos_push_usuario"');
    await queryRunner.query('DROP INDEX "UQ_dispositivos_push_token"');
    await queryRunner.query('DROP TABLE "dispositivos_push"');
  }
}
