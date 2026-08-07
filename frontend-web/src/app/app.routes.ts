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
    path: 'eventos-clinicos',
    loadComponent: () => import('./shared/layout/vet-layout').then((m) => m.VetLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/eventos-clinicos/pages/buscar/buscar-mascota').then(
            (m) => m.BuscarMascotaPage,
          ),
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./features/eventos-clinicos/pages/create/create-evento-clinico').then(
            (m) => m.CreateEventoClinicoPage,
          ),
      },
      {
        path: 'mascota/:idMascota',
        loadComponent: () =>
          import('./features/eventos-clinicos/pages/historia/historia-clinica').then(
            (m) => m.HistoriaClinicaPage,
          ),
      },
      {
        path: 'pacientes',
        loadComponent: () =>
          import('./features/mascotas/pages/list/mascotas-list').then(
            (m) => m.MascotasListPage,
          ),
        data: { heading: 'Mis Pacientes', showHistoriaClinica: true },
      },
      {
        path: 'pacientes/nueva',
        loadComponent: () =>
          import('./features/mascotas/pages/create/create-mascota').then(
            (m) => m.CreateMascotaPage,
          ),
      },
      {
        path: 'pacientes/:id',
        loadComponent: () =>
          import('./features/mascotas/pages/profile/mascota-profile').then(
            (m) => m.MascotaProfilePage,
          ),
        data: { backLabel: 'Volver a mis pacientes' },
      },
      {
        path: 'duenos/alta-asistida',
        loadComponent: () =>
          import('./features/duenos/pages/alta-asistida/alta-asistida-dueno').then(
            (m) => m.AltaAsistidaDuenoPage,
          ),
      },
    ],
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
    path: 'olvide-contrasena',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'restablecer-contrasena',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
