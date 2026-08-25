import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';

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
    canActivate: [authGuard],
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
    canActivate: [authGuard],
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
      {
        path: 'disponibilidad',
        loadComponent: () =>
          import(
            './features/disponibilidades-veterinarias/pages/configuracion-disponibilidad/configuracion-disponibilidad'
          ).then((m) => m.ConfiguracionDisponibilidadPage),
      },
      {
        path: 'turnos',
        loadComponent: () =>
          import(
            './features/turnos-veterinarios/pages/gestion-turnos/gestion-turnos'
          ).then((m) => m.GestionTurnosVeterinariosPage),
      },
    ],
  },
  {
    path: 'servicios',
    loadComponent: () => import('./shared/layout/vet-layout').then((m) => m.VetLayout),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/servicios/pages/list/servicios-list').then(
            (m) => m.ServiciosListPage,
          ),
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./features/servicios/pages/form/servicio-form').then(
            (m) => m.ServicioFormPage,
          ),
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./features/servicios/pages/form/servicio-form').then(
            (m) => m.ServicioFormPage,
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
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./shared/layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/admin/pages/usuarios/usuarios').then(
            (m) => m.UsuariosAdminPage,
          ),
      },
      {
        path: 'usuarios/:id',
        loadComponent: () =>
          import('./features/admin/pages/usuario-detalle/usuario-detalle').then(
            (m) => m.UsuarioDetallePage,
          ),
      },
      {
        path: 'validaciones',
        loadComponent: () =>
          import('./features/admin/pages/validaciones/validaciones').then(
            (m) => m.ValidacionesAdminPage,
          ),
      },
      {
        path: 'validaciones/:id',
        loadComponent: () =>
          import('./features/admin/pages/validacion-detalle/validacion-detalle').then(
            (m) => m.ValidacionDetallePage,
          ),
      },
      {
        path: '',
        redirectTo: 'usuarios',
        pathMatch: 'full',
      },
    ],
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
