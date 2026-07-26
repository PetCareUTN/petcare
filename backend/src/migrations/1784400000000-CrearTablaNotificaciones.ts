import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaNotificaciones1784400000000
  implements MigrationInterface
{
  name = 'CrearTablaNotificaciones1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "notification_type_enum" AS ENUM ('solicitud_recibida', 'aprobacion', 'rechazo')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notificaciones" (
        "id_notificacion" SERIAL NOT NULL,
        "id_usuario" integer NOT NULL,
        "tipo" character varying(50) NOT NULL,
        "titulo" character varying(150) NOT NULL,
        "cuerpo" text NOT NULL,
        "leida" boolean NOT NULL DEFAULT false,
        "fecha_envio" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notificaciones_id_notificacion" PRIMARY KEY ("id_notificacion")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificaciones" ADD CONSTRAINT "FK_notificaciones_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notificaciones" DROP CONSTRAINT "FK_notificaciones_usuario"`,
    );
    await queryRunner.query(`DROP TABLE "notificaciones"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
