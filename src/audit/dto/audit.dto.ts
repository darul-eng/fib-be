import { IsOptional, IsString, IsUUID } from 'class-validator';

export class StartAuditDto {
  @IsUUID()
  locationId: string;
}

export class ScanAuditDto {
  @IsString()
  token: string;
}

export class ManualCheckDto {
  @IsUUID()
  assetId: string;
}

export class MoveHereDto {
  @IsUUID()
  assetId: string;
}

export class FinishAuditDto {
  @IsOptional()
  @IsString()
  catatan?: string;
}
