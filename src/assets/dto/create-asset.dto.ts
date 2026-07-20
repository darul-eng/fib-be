import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
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

// lokasi, kondisi, dan pemegang HANYA boleh berubah lewat aksi "Pindahkan aset"
// (modul movements) agar setiap perubahan tercatat di riwayat — lihat Tahap 3.
export class UpdateAssetDto extends PartialType(
  OmitType(CreateAssetDto, ['kondisi', 'locationId', 'holderName'] as const),
) {}

export class DuplicateAssetDto {
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(200)
  jumlah: number;
}
