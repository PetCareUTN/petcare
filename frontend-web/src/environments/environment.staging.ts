/*
 * Ambiente de STAGING (rama develop, deploys de preview de Vercel).
 *
 * Hoy apunta al MISMO backend que producción, porque todavía existe un solo
 * environment en Railway. Cuando se cree el de staging, con su propia base de
 * datos de prueba, hay que cambiar esta URL. Ver docs/deploy.md.
 */
export const environment = {
  production: false,
  apiUrl: 'https://backend-production-4169.up.railway.app',
};
