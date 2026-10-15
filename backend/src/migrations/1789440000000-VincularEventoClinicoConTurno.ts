import { MigrationInterface, QueryRunner } from 'typeorm';

export class VincularEventoClinicoConTurno1789440000000 implements MigrationInterface {
  name = 'VincularEventoClinicoConTurno1789440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable a propósito: una atención puede no venir de un turno agendado
    // (una urgencia que llega sin reserva), y esos eventos tienen que seguir
    // cargándose igual que hasta ahora. Los eventos que ya existen quedan en
    // NULL: no hay forma confiable de adivinar a qué turno correspondían.
    await queryRunner.query(`
      ALTER TABLE "eventos_clinicos"
      ADD COLUMN "id_turno" integer
    `);

    // ON DELETE SET NULL y no CASCADE: si alguna vez se borra un turno, la
    // atención es parte de la historia clínica de la mascota y no puede
    // desaparecer con él.
    await queryRunner.query(`
      ALTER TABLE "eventos_clinicos"
      ADD CONSTRAINT "FK_eventos_clinicos_turno"
      FOREIGN KEY ("id_turno") REFERENCES "turnos_veterinarios"("id_turno")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Único: un turno genera a lo sumo una atención, y así dos cargas
    // simultáneas sobre el mismo turno no pueden duplicar el evento. El
    // índice ignora los NULL, por lo que no limita las atenciones sin turno.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_eventos_clinicos_turno"
      ON "eventos_clinicos" ("id_turno")
      WHERE "id_turno" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "UQ_eventos_clinicos_turno"
    `);
    await queryRunner.query(`
      ALTER TABLE "eventos_clinicos" DROP CONSTRAINT "FK_eventos_clinicos_turno"
    `);
    await queryRunner.query(`
      ALTER TABLE "eventos_clinicos" DROP COLUMN "id_turno"
    `);
  }
}
