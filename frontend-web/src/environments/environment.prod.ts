/*
 * Ambiente de PRODUCCION (rama main, dominio productivo de Vercel).
 * Angular reemplaza environment.ts por este archivo al compilar con
 * --configuration production (ver fileReplacements en angular.json).
 *
 * apiUrl es el dominio del backend en Railway, sin barra final.
 */
export const environment = {
  production: true,
  apiUrl: 'https://backend-production-4169.up.railway.app',
};
