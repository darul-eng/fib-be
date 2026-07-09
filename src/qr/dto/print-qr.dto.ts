import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PrintQrDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locationIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(4)
  columns?: number;

  @IsOptional()
  @IsIn(['kecil', 'sedang'])
  size?: 'kecil' | 'sedang';
}
