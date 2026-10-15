import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { buildDatabaseConnection } from './config/database.config';

dotenv.config();

/*
 * Los patrones se arman con __dirname para que el mismo archivo sirva en los
 * dos escenarios: en desarrollo __dirname apunta a src/ y matchean los .ts, y
 * en produccion apunta a dist/ y matchean los .js compilados. Con rutas
 * relativas fijas ("src/**") el CLI no encontraba nada corriendo desde dist.
 */
// En Windows join() devuelve separadores "\", que el glob de TypeORM no matchea.
const raiz = join(__dirname).replace(/\\/g, '/');

export default new DataSource({
  ...buildDatabaseConnection(),
  entities: [`${raiz}/**/*.entity.{ts,js}`],
  migrations: [`${raiz}/migrations/*.{ts,js}`],
  synchronize: false,
});
