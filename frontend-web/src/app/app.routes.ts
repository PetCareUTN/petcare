import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/auth/pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then((m) => m.RegisterPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'mascotas/nueva',
    loadComponent: () =>
      import('./features/mascotas/pages/create/create-mascota').then((m) => m.CreateMascotaPage),
  },
  {
    path: 'mascotas/:id',
    loadComponent: () =>
      import('./features/mascotas/pages/profile/mascota-profile').then((m) => m.MascotaProfilePage),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
