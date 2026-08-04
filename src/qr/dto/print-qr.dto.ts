import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class PrintQrDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locationIds?: string[];

  // Cetak QR seluruh aset di bawah satu lokasi (gedung/lantai/ruangan), tanpa
  // batas jumlah — dipakai alur "pilih ruangan lalu cetak semua" di menu Cetak QR.
  @IsOptional()
  @IsUUID()
  assetLocationId?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(4)
  columns?: number;

  @IsOptional()
  @IsIn(['kecil', 'sedang'])
  size?: 'kecil' | 'sedang';
}
