import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(idUsuario: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { idUsuario } });
  }

  async create(data: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    idRol: number;
  }): Promise<User> {
    const user = this.usersRepository.create({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password: data.password,
      rol: { idRol: data.idRol },
    });

    return this.usersRepository.save(user);
  }
}
