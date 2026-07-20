import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export class ThemeSettingDto {
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'primary harus warna hex, mis. #059669' })
  primary?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'primaryDark harus warna hex, mis. #047857' })
  primaryDark?: string;
}

export class FacultySettingDto {
  @IsString()
  @MaxLength(200)
  name!: string;
}

export class PublicPrivacySettingDto {
  @IsBoolean()
  showHolder!: boolean;
}

// Kunci pengaturan yang dikenal sistem — dipakai untuk memilih DTO validasi yang sesuai.
// Menolak kunci di luar daftar ini menutup celah body tak tervalidasi (lihat settings.controller.ts).
export const SETTING_DTOS: Record<string, new () => object> = {
  theme: ThemeSettingDto,
  faculty: FacultySettingDto,
  public_privacy: PublicPrivacySettingDto,
};

export type SettingKey = keyof typeof SETTING_DTOS;
