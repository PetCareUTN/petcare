import { User } from '../../users/entities/user.entity';
import { UserPublicDto } from '../../users/dto/user-public.dto';

export class LoginResponseDto {
  token: string;
  usuario: UserPublicDto;

  static build(token: string, user: User): LoginResponseDto {
    const dto = new LoginResponseDto();
    dto.token = token;
    dto.usuario = UserPublicDto.fromEntity(user);
    return dto;
  }
}
