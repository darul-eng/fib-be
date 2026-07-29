import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AssetCondition } from '@prisma/client';

export class MoveAssetDto {
  @IsUUID()
  assetId: string;

  // Nilai `updatedAt` aset yang dilihat client sebelum mengirim mutasi — dipakai
  // sebagai penjaga optimistic locking agar dua mutasi bersamaan pada aset yang
  // sama tidak menghasilkan riwayat yang saling bertentangan (lihat MovementsService.move).
  @IsISO8601()
  expectedUpdatedAt: string;

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
