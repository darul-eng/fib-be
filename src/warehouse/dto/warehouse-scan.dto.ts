import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class WarehouseMasukDto {
  @IsString()
  @IsNotEmpty()
  qrToken: string;

  @IsOptional()
  @IsString()
  catatan?: string;
}

export class WarehouseKeluarDto {
  @IsString()
  @IsNotEmpty()
  qrToken: string;

  @IsUUID()
  locationId: string;

  @IsOptional()
  @IsString()
  catatan?: string;
}
