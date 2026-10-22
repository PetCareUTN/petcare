import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El veterinario agenda turnos desde la web.
 *
 * - `turnos_veterinarios.creado_por`: quién cargó el turno (el dueño desde la
 *   app o la veterinaria desde la web). Lo existente lo cargó el dueño.
 * - `turnos_veterinarios.sobrecupo`: el veterinario lo cargó con el horario ya
 *   lleno, a propósito (un sobreturno).
 */
export class AgendaVeterinarioSobreturnos1789490000000
  implements MigrationInterface
{
  name = 'AgendaVeterinarioSobreturnos1789490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "turnos_veterinarios"
      ADD COLUMN "creado_por" character varying(20) NOT NULL DEFAULT 'dueño',
      ADD COLUMN "sobrecupo" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "turnos_veterinarios"
      DROP COLUMN "sobrecupo",
      DROP COLUMN "creado_por"
    `);
  }
}
