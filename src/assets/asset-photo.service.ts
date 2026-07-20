import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const PHOTO_DIR = join(process.cwd(), 'uploads', 'assets');
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;

@Injectable()
export class AssetPhotoService {
  // Selalu decode ulang isi file (bukan cuma percaya mimetype/ekstensi) dan
  // re-encode ke WebP: file bukan-gambar otomatis ditolak oleh sharp saat
  // decode, dan hasil akhirnya selalu .webp terlepas dari nama/ekstensi asli.
  async saveFromBuffer(buffer: Buffer): Promise<string> {
    await mkdir(PHOTO_DIR, { recursive: true });

    let processed: Buffer;
    try {
      processed = await sharp(buffer)
        .rotate()
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException('File bukan gambar yang valid');
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    await writeFile(join(PHOTO_DIR, filename), processed);
    return `/uploads/assets/${filename}`;
  }

  async deleteIfExists(fotoPath: string | null): Promise<void> {
    if (!fotoPath) return;
    const filename = fotoPath.replace('/uploads/assets/', '');
    if (!filename || filename.includes('/') || filename.includes('\\')) return;
    try {
      await unlink(join(PHOTO_DIR, filename));
    } catch {
      // Sudah tidak ada / gagal hapus — bukan kegagalan yang perlu menggagalkan request.
    }
  }
}
