import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '@prisma/client';

export class CategoryFieldDto {
  @IsString()
  label: string;

  @IsString()
  key: string;

  @IsEnum(FieldType)
  tipe: FieldType;

  @IsOptional()
  @IsBoolean()
  wajib?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opsi?: string[];

  @IsOptional()
  @IsInt()
  urutan?: number;
}

export class CreateCategoryDto {
  @IsString()
  nama: string;

  @IsOptional()
  @IsString()
  deskripsi?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryFieldDto)
  fields?: CategoryFieldDto[];
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsString()
  deskripsi?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryFieldDto)
  fields?: CategoryFieldDto[];
}
