import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const TIMELINE_LIMIT = 15;

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async getAssetByToken(token: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { qrToken: token, deletedAt: null },
      include: {
        category: { include: { fields: { orderBy: { urutan: 'asc' } } } },
        location: true,
        person: true,
      },
    });
    if (!asset) throw new NotFoundException('Aset tidak ditemukan');

    const showHolder = await this.isHolderPublic();
    const rawAttributes = asset.attributes as Record<string, unknown>;
    const attributes = asset.category.fields
      .filter((f) => f.isPublic)
      .map((f) => ({ label: f.label, value: rawAttributes[f.key] }))
      .filter((a) => a.value !== undefined && a.value !== null && a.value !== '');

    const ancestors = asset.location ? await this.getAncestorNames(asset.location.parentId) : [];
    const lokasi = asset.location ? [...ancestors, asset.location.nama].join(' › ') : null;

    const movements = await this.prisma.movement.findMany({
      where: { assetId: asset.id },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_LIMIT,
      include: {
        fromLocation: { select: { nama: true } },
        toLocation: { select: { nama: true } },
        fromPerson: { select: { nama: true } },
        toPerson: { select: { nama: true } },
      },
    });

    return {
      kode: asset.kode,
      nama: asset.nama,
      kategori: asset.category.nama,
      kondisi: asset.kondisi,
      lokasi,
      pemegang: showHolder ? (asset.person?.nama ?? null) : null,
      foto: asset.fotoPath,
      attributes,
      timeline: movements.map((m) => ({
        tipe: m.tipe,
        dari: m.fromLocation?.nama ?? m.fromPerson?.nama ?? m.fromKondisi ?? null,
        ke: m.toLocation?.nama ?? m.toPerson?.nama ?? m.toKondisi ?? null,
        catatan: m.catatan,
        createdAt: m.createdAt,
      })),
    };
  }

  async getLocationByToken(token: string) {
    const location = await this.prisma.location.findUnique({ where: { qrToken: token } });
    if (!location) throw new NotFoundException('Ruangan tidak ditemukan');

    const assets = await this.prisma.asset.findMany({
      where: { locationId: location.id, deletedAt: null },
      select: { kode: true, nama: true, kondisi: true, qrToken: true },
      orderBy: { nama: 'asc' },
    });

    const ringkasanKondisi = assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.kondisi] = (acc[a.kondisi] ?? 0) + 1;
      return acc;
    }, {});

    const ancestors = await this.getAncestorNames(location.parentId);

    return {
      nama: location.nama,
      tipe: location.tipe,
      lokasiInduk: ancestors.length ? ancestors.join(' › ') : null,
      totalAset: assets.length,
      ringkasanKondisi,
      aset: assets,
    };
  }

  private async isHolderPublic(): Promise<boolean> {
    try {
      const value = (await this.settings.get('public_privacy')) as { showHolder?: boolean } | null;
      return value?.showHolder ?? true;
    } catch {
      return true;
    }
  }

  private async getAncestorNames(parentId: string | null): Promise<string[]> {
    const names: string[] = [];
    let current = parentId;
    while (current) {
      const parent: { nama: string; parentId: string | null } | null = await this.prisma.location.findUnique({
        where: { id: current },
        select: { nama: true, parentId: true },
      });
      if (!parent) break;
      names.unshift(parent.nama);
      current = parent.parentId;
    }
    return names;
  }
}
