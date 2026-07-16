import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { LocationType } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Nama lokasi wajib diisi' })
  @MaxLength(120)
  nama: string;

  @IsEnum(LocationType)
  tipe: LocationType;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'Nama lokasi wajib diisi' })
  @MaxLength(120)
  nama?: string;

  @IsOptional()
  @IsEnum(LocationType)
  tipe?: LocationType;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
