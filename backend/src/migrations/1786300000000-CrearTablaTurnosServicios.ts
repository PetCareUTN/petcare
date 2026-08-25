import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaTurnosServicios1786300000000
  implements MigrationInterface
{
  name = 'CrearTablaTurnosServicios1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "turnos_servicios" (
        "id_turno" SERIAL NOT NULL,
        "id_servicio" integer NOT NULL,
        "id_mascota" integer NOT NULL,
        "id_duenio" integer NOT NULL,
        "fecha" date NOT NULL,
        "hora_inicio" time NOT NULL,
        "hora_fin" time NOT NULL,
        "notas" text,
        "estado" character varying(20) NOT NULL DEFAULT 'confirmado',
        "cancelado_por" character varying(20),
        "motivo_cancelacion" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_turnos_servicios" PRIMARY KEY ("id_turno")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_turnos_servicios_servicio_estado" ON "turnos_servicios" ("id_servicio", "estado")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_turnos_servicios_fecha_hora" ON "turnos_servicios" ("fecha", "hora_inicio")',
    );
    await queryRunner.query(`
      ALTER TABLE "turnos_servicios"
      ADD CONSTRAINT "FK_turnos_servicios_servicio"
      FOREIGN KEY ("id_servicio") REFERENCES "servicios"("id_servicio")
    `);
    await queryRunner.query(`
      ALTER TABLE "turnos_servicios"
      ADD CONSTRAINT "FK_turnos_servicios_mascota"
      FOREIGN KEY ("id_mascota") REFERENCES "mascotas"("id_mascota")
    `);
    await queryRunner.query(`
      ALTER TABLE "turnos_servicios"
      ADD CONSTRAINT "FK_turnos_servicios_duenio"
      FOREIGN KEY ("id_duenio") REFERENCES "usuarios"("id_usuario")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "turnos_servicios" DROP CONSTRAINT "FK_turnos_servicios_duenio"',
    );
    await queryRunner.query(
      'ALTER TABLE "turnos_servicios" DROP CONSTRAINT "FK_turnos_servicios_mascota"',
    );
    await queryRunner.query(
      'ALTER TABLE "turnos_servicios" DROP CONSTRAINT "FK_turnos_servicios_servicio"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_turnos_servicios_fecha_hora"',
    );
    await queryRunner.query(
      'DROP INDEX "IDX_turnos_servicios_servicio_estado"',
    );
    await queryRunner.query('DROP TABLE "turnos_servicios"');
  }
}
