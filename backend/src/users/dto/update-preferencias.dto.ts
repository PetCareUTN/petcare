import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Preferencias de notificaciones del usuario (US-40).
 *
 * Va aparte de `UpdateUserDto` a propósito: ese DTO son los datos del perfil
 * —nombre, documento, email— y cambiarlos dispara validaciones y flujos que no
 * tienen nada que ver con prender o apagar un aviso.
 */
export class UpdatePreferenciasDto {
  @IsBoolean()
  @IsOptional()
  recordatoriosVacunas?: boolean;
}
