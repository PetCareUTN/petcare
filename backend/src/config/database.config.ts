import type { DataSourceOptions } from 'typeorm';

/**
 * Parametros de conexion a PostgreSQL compartidos por el AppModule (runtime) y
 * por el DataSource del CLI de TypeORM (migraciones).
 *
 * En local se usan las variables sueltas (DATABASE_HOST, DATABASE_PORT, ...).
 * Railway y la mayoria de los Postgres administrados exponen en cambio una
 * unica DATABASE_URL; si esta presente, tiene prioridad.
 */
export function buildDatabaseConnection(): Pick<
  DataSourceOptions & { type: 'postgres' },
  'type' | 'url' | 'host' | 'port' | 'username' | 'password' | 'database' | 'ssl'
> {
  const ssl = resolveSsl();

  if (process.env.DATABASE_URL) {
    return { type: 'postgres', url: process.env.DATABASE_URL, ssl };
  }

  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl,
  };
}

/**
 * Los Postgres administrados exigen TLS, pero presentan certificados firmados
 * por una CA propia que Node no conoce. Sin rejectUnauthorized: false la
 * conexion falla con "self signed certificate in certificate chain".
 *
 * Queda apagado por defecto para no romper el Postgres local ni el de CI, que
 * no hablan TLS.
 */
function resolveSsl(): false | { rejectUnauthorized: boolean } {
  return process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false;
}
