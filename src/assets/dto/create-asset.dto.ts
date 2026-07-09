import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { AssetCondition } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  nama: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsEnum(AssetCondition)
  kondisi?: AssetCondition;

  @IsOptional()
  @IsInt()
  tahunBeli?: number;

  @IsOptional()
  @IsNumber()
  hargaBeli?: number;

  @IsOptional()
  @IsString()
  sumberDana?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class DuplicateAssetDto {
  @IsInt()
  @IsPositive()
  @Min(1)
  jumlah: number;
}
