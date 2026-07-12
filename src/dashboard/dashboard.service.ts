import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { Prisma, AssetCondition } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

const NEEDS_ATTENTION: AssetCondition[] = ['rusak_ringan', 'rusak_berat', 'perbaikan'];

const KONDISI_LABEL: Record<AssetCondition, string> = {
  baik: 'Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
  perbaikan: 'Dalam Perbaikan',
  dihapus: 'Dihapus',
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryDashboardDto): Prisma.AssetWhereInput {
    return {
      deletedAt: null,
      categoryId: query.categoryId,
      locationId: query.locationId,
      kondisi: query.kondisi,
    };
  }

  async stats(query: QueryDashboardDto) {
    const where = this.buildWhere(query);

    const [totals, byKondisi, byLocation, recentMovements] = await Promise.all([
      this.prisma.asset.aggregate({
        where,
        _count: { _all: true },
        _sum: { hargaBeli: true },
      }),
      this.prisma.asset.groupBy({
        by: ['kondisi'],
        where,
        _count: { _all: true },
      }),
      this.prisma.asset.groupBy({
        by: ['locationId'],
        where,
        _count: { _all: true },
        orderBy: { _count: { locationId: 'desc' } },
        take: 8,
      }),
      this.prisma.movement.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, kode: true, nama: true } },
          fromLocation: { select: { id: true, nama: true } },
          toLocation: { select: { id: true, nama: true } },
          fromPerson: { select: { id: true, nama: true } },
          toPerson: { select: { id: true, nama: true } },
          movedBy: { select: { id: true, nama: true } },
        },
      }),
    ]);

    const locationIds = byLocation.map((l) => l.locationId).filter((id): id is string => id !== null);
    const locations = locationIds.length
      ? await this.prisma.location.findMany({
          where: { id: { in: locationIds } },
          select: { id: true, nama: true },
        })
      : [];
    const locationName = new Map(locations.map((l) => [l.id, l.nama]));

    const conditionDistribution = byKondisi.map((row) => ({
      kondisi: row.kondisi,
      count: row._count._all,
    }));

    const needsAttention = conditionDistribution
      .filter((row) => NEEDS_ATTENTION.includes(row.kondisi))
      .reduce((sum, row) => sum + row.count, 0);

    const locationDistribution = byLocation.map((row) => ({
      locationId: row.locationId,
      locationName: row.locationId ? (locationName.get(row.locationId) ?? 'Tidak diketahui') : 'Tanpa lokasi',
      count: row._count._all,
    }));

    return {
      totalAssets: totals._count._all,
      totalValue: totals._sum.hargaBeli ? Number(totals._sum.hargaBeli) : 0,
      conditionDistribution,
      needsAttention,
      locationDistribution,
      recentMovements,
    };
  }

  async exportExcel(query: QueryDashboardDto): Promise<Buffer> {
    const where = this.buildWhere(query);

    const assets = await this.prisma.asset.findMany({
      where,
      include: { category: { select: { nama: true } }, location: { select: { nama: true } } },
      orderBy: { kode: 'asc' },
    });

    const rows = assets.map((a) => ({
      Kode: a.kode,
      Nama: a.nama,
      Kategori: a.category.nama,
      Kondisi: KONDISI_LABEL[a.kondisi],
      Lokasi: a.location?.nama ?? '-',
      'Tahun Beli': a.tahunBeli ?? '',
      'Harga Beli': a.hargaBeli ? Number(a.hargaBeli) : '',
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Aset');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
