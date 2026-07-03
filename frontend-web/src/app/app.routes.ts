import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'register',
    loadComponent: () => import('./features/auth/pages/register/register').then((m) => m.RegisterPage),
  },
];
