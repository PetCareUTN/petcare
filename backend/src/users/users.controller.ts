import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPublicDto } from './dto/user-public.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
  ): Promise<UserPublicDto> {
    const updatedUser = await this.usersService.update(user.sub, dto);
    return UserPublicDto.fromEntity(updatedUser);
  }
}
