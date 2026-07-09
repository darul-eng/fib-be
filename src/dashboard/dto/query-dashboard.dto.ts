import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AssetCondition } from '@prisma/client';

export class QueryDashboardDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsEnum(AssetCondition)
  kondisi?: AssetCondition;
}
