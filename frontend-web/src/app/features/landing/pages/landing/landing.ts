import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Funcionalidad {
  icono: string;
  titulo: string;
  descripcion: string;
}

interface Paso {
  titulo: string;
  descripcion: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingPage {
  protected readonly anio = new Date().getFullYear();

  /*
   * El APK firmado se comparte por Drive (ver docs/deploy.md). Mientras no
   * haya link público, el botón de descarga se muestra deshabilitado.
   */
  protected readonly urlDescargaApk: string | null = null;

  /*
   * Los iconos son paths de 24x24 con trazo, para que todos compartan el
   * mismo grosor y no haga falta una libreria de iconos solo para esta pagina.
   */
  protected readonly paraDuenos: Funcionalidad[] = [
    {
      icono: 'M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z',
      titulo: 'Perfil digital de tu mascota',
      descripcion: 'Foto, especie, raza, peso y datos importantes de cada mascota, siempre a mano.',
    },
    {
      icono: 'M9 3h6v4H9zM5 5h4M15 5h4v16H5V5M9 12h6M12 9v6',
      titulo: 'Historia clínica unificada',
      descripcion:
        'Consultas, vacunas y tratamientos de todos sus veterinarios en un solo historial.',
    },
    {
      icono: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
      titulo: 'Turnos en minutos',
      descripcion: 'Reservá turnos con veterinarios y servicios según su disponibilidad real.',
    },
    {
      icono:
        'M12 21s-6-5.33-6-11a6 6 0 0 1 12 0c0 5.67-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
      titulo: 'Mascotas perdidas',
      descripcion:
        'Reportá una pérdida y la comunidad te ayuda a encontrarla con ubicaciones en el mapa.',
    },
    {
      icono: 'M7 7l10 10-5 5V2l5 5L7 17',
      titulo: 'Alerta de separación BLE',
      descripcion:
        'Con un dispositivo Bluetooth en el collar, la app te avisa si tu mascota se aleja.',
    },
    {
      icono: 'M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6',
      titulo: 'Adopciones',
      descripcion: 'Publicá o encontrá mascotas en adopción y dales una nueva familia.',
    },
  ];

  protected readonly paraVeterinarios: Funcionalidad[] = [
    {
      icono: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3',
      titulo: 'Agenda y disponibilidad',
      descripcion: 'Configurá tus horarios, gestioná turnos y sumá sobreturnos cuando haga falta.',
    },
    {
      icono: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
      titulo: 'Historia clínica por voz',
      descripcion:
        'Dictá la consulta y el asistente la transforma en un evento clínico listo para revisar.',
    },
    {
      icono: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
      titulo: 'Reportes de tu actividad',
      descripcion: 'Seguí turnos, pacientes y servicios desde un tablero claro.',
    },
    {
      icono:
        'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
      titulo: 'Alta asistida de dueños',
      descripcion:
        'Registrá en el consultorio a dueños que todavía no usan PetCare y a sus mascotas.',
    },
  ];

  protected readonly pasos: Paso[] = [
    {
      titulo: 'Descargá la app',
      descripcion: 'Instalá PetCare en tu celular Android.',
    },
    {
      titulo: 'Creá tu cuenta',
      descripcion: 'Registrate gratis con tu email o con tu cuenta de Google.',
    },
    {
      titulo: 'Cargá tus mascotas',
      descripcion:
        'Armá su perfil, pedí turnos y seguí su historia clínica después de cada consulta.',
    },
  ];
}
