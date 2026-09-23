/*
 * Ambiente de PRODUCCION (rama main, dominio productivo de Vercel).
 * Angular reemplaza environment.ts por este archivo al compilar con
 * --configuration production (ver fileReplacements en angular.json).
 *
 * TODO: reemplazar apiUrl por el dominio real del backend en Railway apenas
 * se cree el servicio de produccion. Sin barra final.
 */
export const environment = {
  production: true,
  apiUrl: 'https://petcare-backend-production.up.railway.app',
};
