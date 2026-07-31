import { Routes } from '@angular/router';

export const routes: Routes = [
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
    path: '',
    loadComponent: () => import('./shared/layout/app-layout').then((m) => m.AppLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/auth/pages/home/home').then((m) => m.HomePage),
      },
      {
        path: 'mascotas',
        loadComponent: () =>
          import('./features/mascotas/pages/list/mascotas-list').then(
            (m) => m.MascotasListPage,
          ),
      },
      {
        path: 'mascotas/nueva',
        loadComponent: () =>
          import('./features/mascotas/pages/create/create-mascota').then(
            (m) => m.CreateMascotaPage,
          ),
      },
      {
        path: 'mascotas/:id',
        loadComponent: () =>
          import('./features/mascotas/pages/profile/mascota-profile').then(
            (m) => m.MascotaProfilePage,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/profile/pages/edit/profile-edit').then((m) => m.ProfileEditPage),
      },
    ],
  },
  {
    path: 'veterinarios/solicitar',
    loadComponent: () =>
      import('./features/veterinarios/pages/solicitar-validacion/solicitar-validacion').then(
        (m) => m.SolicitarValidacionPage,
      ),
  },
  {
    path: 'veterinarios/estado',
    loadComponent: () =>
      import('./features/veterinarios/pages/estado-validacion/estado-validacion').then(
        (m) => m.EstadoValidacionPage,
      ),
  },
  {
    path: 'admin/validaciones',
    loadComponent: () =>
      import('./features/admin/pages/validaciones/validaciones').then(
        (m) => m.ValidacionesAdminPage,
      ),
  },
  {
    path: 'admin/validaciones/:id',
    loadComponent: () =>
      import('./features/admin/pages/validacion-detalle/validacion-detalle').then(
        (m) => m.ValidacionDetallePage,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
