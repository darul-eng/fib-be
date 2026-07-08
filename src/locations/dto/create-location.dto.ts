import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LocationType } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
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
  nama?: string;

  @IsOptional()
  @IsEnum(LocationType)
  tipe?: LocationType;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
