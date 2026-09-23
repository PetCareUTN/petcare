/*
 * Ambiente de STAGING (rama develop, deploys de preview de Vercel).
 * Apunta al servicio de staging de Railway, que tiene su propia base con datos
 * de prueba. Ver docs/deploy.md.
 *
 * TODO: reemplazar apiUrl por el dominio real del backend de staging. Sin barra final.
 */
export const environment = {
  production: false,
  apiUrl: 'https://petcare-backend-staging.up.railway.app',
};
