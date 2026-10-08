import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarProvinciaAUsuarios1789420000000 implements MigrationInterface {
  name = 'AgregarProvinciaAUsuarios1789420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios" ADD COLUMN "provincia" character varying(50)
    `);

    // Las veterinarias ya registradas guardaban la provincia dentro de la
    // dirección. Se toma el último tramo de la dirección ("Av. Colón 1250,
    // Córdoba" -> "Córdoba") si coincide con una provincia; si no, se usa la
    // provincia de la matrícula, que es obligatoria desde el registro.
    await queryRunner.query(`
      UPDATE "usuarios" u
      SET "provincia" = COALESCE(
        (
          SELECT p.nombre
          FROM (VALUES
            ('Buenos Aires', 'Buenos Aires'),
            ('Catamarca', 'Catamarca'),
            ('Chaco', 'Chaco'),
            ('Chubut', 'Chubut'),
            ('Ciudad Autónoma de Buenos Aires', 'Ciudad Autónoma de Buenos Aires'),
            ('CABA', 'Ciudad Autónoma de Buenos Aires'),
            ('Capital Federal', 'Ciudad Autónoma de Buenos Aires'),
            ('Corrientes', 'Corrientes'),
            ('Córdoba', 'Córdoba'),
            ('Entre Ríos', 'Entre Ríos'),
            ('Formosa', 'Formosa'),
            ('Jujuy', 'Jujuy'),
            ('La Pampa', 'La Pampa'),
            ('La Rioja', 'La Rioja'),
            ('Mendoza', 'Mendoza'),
            ('Misiones', 'Misiones'),
            ('Neuquén', 'Neuquén'),
            ('Río Negro', 'Río Negro'),
            ('Salta', 'Salta'),
            ('San Juan', 'San Juan'),
            ('San Luis', 'San Luis'),
            ('Santa Cruz', 'Santa Cruz'),
            ('Santa Fe', 'Santa Fe'),
            ('Santiago del Estero', 'Santiago del Estero'),
            ('Tierra del Fuego', 'Tierra del Fuego'),
            ('Tucumán', 'Tucumán')
          ) AS p(alias, nombre)
          WHERE lower(p.alias) = lower(trim(split_part(u."direccion", ',', array_length(string_to_array(u."direccion", ','), 1))))
          LIMIT 1
        ),
        (SELECT p.nombre
         FROM (VALUES
            ('Buenos Aires'), ('Catamarca'), ('Chaco'), ('Chubut'),
            ('Ciudad Autónoma de Buenos Aires'), ('Corrientes'), ('Córdoba'),
            ('Entre Ríos'), ('Formosa'), ('Jujuy'), ('La Pampa'), ('La Rioja'),
            ('Mendoza'), ('Misiones'), ('Neuquén'), ('Río Negro'), ('Salta'),
            ('San Juan'), ('San Luis'), ('Santa Cruz'), ('Santa Fe'),
            ('Santiago del Estero'), ('Tierra del Fuego'), ('Tucumán')
         ) AS p(nombre)
         WHERE lower(p.nombre) = lower(v."provincia_matricula")
         LIMIT 1)
      )
      FROM "veterinarios" v
      WHERE v."id_usuario" = u."id_usuario"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "provincia"`);
  }
}
