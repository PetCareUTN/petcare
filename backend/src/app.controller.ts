import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Estado del servicio')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Comprobar que la API responde',
    description:
      'Endpoint público. Sirve para verificar de un vistazo que el backend está levantado.',
  })
  @ApiResponse({ status: 200, description: 'La API está funcionando.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
