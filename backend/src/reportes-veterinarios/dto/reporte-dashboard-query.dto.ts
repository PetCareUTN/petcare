import { IsDateString, IsOptional } from 'class-validator';

export class ReporteDashboardQueryDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
