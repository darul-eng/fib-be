import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateAssetDto } from './create-asset.dto';

export class ImportCommitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssetDto)
  rows: CreateAssetDto[];
}
