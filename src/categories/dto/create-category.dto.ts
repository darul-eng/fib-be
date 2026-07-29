import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
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

  // Nilai `updatedAt` yang dilihat client saat membuka form ubah — dipakai sebagai
  // penjaga optimistic locking agar dua edit bersamaan pada kategori yang sama
  // tidak saling menimpa diam-diam (lihat CategoriesService.update).
  @IsISO8601()
  expectedUpdatedAt: string;
}
