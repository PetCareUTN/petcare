/*
 * Elige la configuracion de Angular segun el ambiente de Vercel.
 *
 * Vercel usa el mismo comando de build para todos los deploys y distingue el
 * ambiente con VERCEL_ENV. Los deploys de la rama de produccion (main) valen
 * "production"; los de develop y los de cada Pull Request valen "preview" y
 * tienen que pegarle al backend de staging, no al productivo.
 *
 * Ver docs/deploy.md.
 */
import { spawnSync } from 'node:child_process';

const configuracion =
  process.env.VERCEL_ENV === 'production' ? 'production' : 'staging';

console.log(
  `[build-vercel] VERCEL_ENV=${process.env.VERCEL_ENV ?? '(sin definir)'} -> ng build --configuration ${configuracion}`,
);

const resultado = spawnSync(
  'npx',
  ['ng', 'build', '--configuration', configuracion],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

process.exit(resultado.status ?? 1);
