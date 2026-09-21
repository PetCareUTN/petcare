import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarReferenciaANotificaciones1789300000000 implements MigrationInterface {
  name = 'AgregarReferenciaANotificaciones1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A qué registro apunta la notificación, para que la app pueda abrir la
    // pantalla correspondiente al tocarla (US-41). Qué representa el id depende
    // del `tipo`: para `mascota_detectada` es el id del reporte de pérdida.
    //
    // Nullable porque las notificaciones que ya existen no apuntan a nada y las
    // de otros tipos todavía no lo usan. Sin FK a propósito: la columna apunta a
    // tablas distintas según el tipo.
    await queryRunner.query(
      `ALTER TABLE "notificaciones" ADD "id_referencia" integer`,
    );
    // US-41 pregunta por la última notificación de un reporte para agrupar las
    // detecciones seguidas.
    await queryRunner.query(
      `CREATE INDEX "IDX_notificaciones_tipo_referencia" ON "notificaciones" ("tipo", "id_referencia")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_notificaciones_tipo_referencia"');
    await queryRunner.query(
      `ALTER TABLE "notificaciones" DROP COLUMN "id_referencia"`,
    );
  }
}
