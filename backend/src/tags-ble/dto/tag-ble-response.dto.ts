import { TagBle } from '../entities/tag-ble.entity';

export class TagBleResponseDto {
  idTagBle: number;
  tagId: string;
  idMascota: number;
  createdAt: Date;

  static fromEntity(tagBle: TagBle): TagBleResponseDto {
    return {
      idTagBle: tagBle.idTagBle,
      tagId: tagBle.tagId,
      idMascota: tagBle.mascota.idMascota,
      createdAt: tagBle.createdAt,
    };
  }
}
