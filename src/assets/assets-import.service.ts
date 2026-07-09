import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { AssetCondition } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

const COMMON_HEADERS = [
  'Nama',
  'Kategori',
  'Kondisi',
  'Tahun Beli',
  'Harga Beli',
  'Sumber Dana',
  'Lokasi',
  'Pemegang',
];

const KONDISI_MAP: Record<string, AssetCondition> = {
  baik: 'baik',
  'rusak ringan': 'rusak_ringan',
  'rusak berat': 'rusak_berat',
  perbaikan: 'perbaikan',
  'dalam perbaikan': 'perbaikan',
};

export type ImportRowResult =
  | { row: number; ok: true; dto: CreateAssetDto }
  | { row: number; ok: false; message: string };

@Injectable()
export class AssetsImportService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const categories = await this.prisma.category.findMany({ include: { fields: true } });
    const locations = await this.prisma.location.findMany();

    const results: ImportRowResult[] = rows.map((raw, index) => {
      const rowNum = index + 2; // baris 1 = header
      try {
        const nama = String(raw['Nama'] ?? '').trim();
        if (!nama) throw new Error('Kolom "Nama" wajib diisi');

        const kategoriNama = String(raw['Kategori'] ?? '').trim();
        const category = categories.find(
          (c) => c.nama.toLowerCase() === kategoriNama.toLowerCase(),
        );
        if (!category) throw new Error(`Kategori "${kategoriNama}" tidak ditemukan`);

        const kondisiRaw = String(raw['Kondisi'] ?? '').trim().toLowerCase();
        const kondisi = kondisiRaw ? KONDISI_MAP[kondisiRaw] : undefined;
        if (kondisiRaw && !kondisi) {
          throw new Error(`Kondisi "${raw['Kondisi']}" tidak dikenali`);
        }

        const lokasiNama = String(raw['Lokasi'] ?? '').trim();
        const location = lokasiNama
          ? locations.find((l) => l.nama.toLowerCase() === lokasiNama.toLowerCase())
          : undefined;
        if (lokasiNama && !location) {
          throw new Error(`Lokasi "${lokasiNama}" tidak ditemukan`);
        }

        const attributes: Record<string, unknown> = {};
        for (const field of category.fields) {
          const value = raw[field.label];
          if (value !== undefined && value !== '') attributes[field.key] = value;
        }

        const tahunRaw = raw['Tahun Beli'];
        const hargaRaw = raw['Harga Beli'];

        const dto: CreateAssetDto = {
          nama,
          categoryId: category.id,
          kondisi,
          tahunBeli: tahunRaw !== '' ? Number(tahunRaw) : undefined,
          hargaBeli: hargaRaw !== '' ? Number(hargaRaw) : undefined,
          sumberDana: String(raw['Sumber Dana'] ?? '').trim() || undefined,
          locationId: location?.id,
          holderName: String(raw['Pemegang'] ?? '').trim() || undefined,
          attributes,
        };

        return { row: rowNum, ok: true, dto };
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Baris tidak valid';
        return { row: rowNum, ok: false, message };
      }
    });

    return {
      valid: results.filter((r): r is Extract<ImportRowResult, { ok: true }> => r.ok),
      errors: results.filter((r): r is Extract<ImportRowResult, { ok: false }> => !r.ok),
    };
  }

  async buildTemplate(categoryId?: string): Promise<Buffer> {
    let headers = [...COMMON_HEADERS];

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        include: { fields: { orderBy: { urutan: 'asc' } } },
      });
      if (category) {
        headers = [...headers, ...category.fields.map((f) => f.label)];
      }
    }

    const sheet = XLSX.utils.aoa_to_sheet([headers]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Template');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
