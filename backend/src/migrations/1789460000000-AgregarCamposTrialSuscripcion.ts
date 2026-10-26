import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarCamposTrialSuscripcion1789460000000
  implements MigrationInterface
{
  name = 'AgregarCamposTrialSuscripcion1789460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "suscripciones" ADD COLUMN "fecha_prueba_fin" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "suscripciones" ADD COLUMN "prueba_usada" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "suscripciones" ADD COLUMN "prueba_notificada" boolean NOT NULL DEFAULT false`,
    );

    // Trial retroactivo: veterinarios APROBADOS con suscripción PENDIENTE_PAGO
    // que nunca pagaron reciben 3 meses de prueba (decisión de plan #10).
    // A propósito NO se toca "fecha_inicio": ese campo significa "activada
    // con pago" y lo usa la lógica de webhooks de MP para distinguir un
    // primer pago rechazado de una cancelación real.
    await queryRunner.query(`
      UPDATE "suscripciones"
      SET "estado" = 'EN_PRUEBA',
          "fecha_prueba_fin" = NOW() + INTERVAL '90 days',
          "fecha_vencimiento" = NOW() + INTERVAL '90 days',
          "prueba_usada" = true
      WHERE "estado" = 'PENDIENTE_PAGO'
        AND "prueba_usada" = false
        AND "id_usuario" IN (
          SELECT "id_usuario" FROM "veterinarios" WHERE "estado_validacion" = 'APROBADO'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "suscripciones"
      SET "estado" = 'PENDIENTE_PAGO',
          "fecha_inicio" = NULL,
          "fecha_prueba_fin" = NULL,
          "fecha_vencimiento" = NULL,
          "prueba_usada" = false
      WHERE "estado" = 'EN_PRUEBA'
    `);
    await queryRunner.query(
      `ALTER TABLE "suscripciones" DROP COLUMN "prueba_notificada"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suscripciones" DROP COLUMN "prueba_usada"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suscripciones" DROP COLUMN "fecha_prueba_fin"`,
    );
  }
}
