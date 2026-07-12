import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { LocationType } from '@prisma/client';

export class QueryLocationDto {
  // Cari ruangan/lokasi berdasarkan nama — dipakai pemilih (dropdown) agar tidak
  // perlu memuat seluruh data sekaligus (mis. saat ruangan berjumlah ratusan).
  @IsOptional()
  @IsString()
  search?: string;

  // Ambil anak langsung dari satu lokasi — dipakai untuk buka-cabang pohon secara lambat.
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsEnum(LocationType)
  tipe?: LocationType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
