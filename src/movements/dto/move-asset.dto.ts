import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AssetCondition } from '@prisma/client';

export class MoveAssetDto {
  @IsUUID()
  assetId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  // Nama pemegang baru; string kosong = lepas pemegang (lihat PeopleService.resolveByName).
  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsEnum(AssetCondition)
  kondisi?: AssetCondition;

  @IsOptional()
  @IsString()
  catatan?: string;
}

export class QueryMovementDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
