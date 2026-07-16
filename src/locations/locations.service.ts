import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, LocationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';
import { generateQrToken } from '../common/qr-token.util';

const SEARCH_LIMIT_DEFAULT = 20;

const REQUIRED_PARENT_TYPE: Record<LocationType, LocationType | null> = {
  gedung: null,
  lantai: LocationType.gedung,
  ruangan: LocationType.lantai,
};

// Kebalikan dari REQUIRED_PARENT_TYPE: tipe anak yang sah untuk tiap tipe induk.
const REQUIRED_PARENT_TYPE_BY_PARENT: Record<LocationType, LocationType | null> = {
  gedung: LocationType.lantai,
  lantai: LocationType.ruangan,
  ruangan: null,
};

const TYPE_LABEL: Record<LocationType, string> = {
  gedung: 'Gedung',
  lantai: 'Lantai',
  ruangan: 'Ruangan',
};

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tiga mode, dipilih dari query yang dikirim:
  // - `search`/`tipe` : pencarian nama dan/atau filter tipe (dipakai pemilih ruangan
  //   cari-sambil-ketik — termasuk saat kotak pencarian masih kosong), dibatasi `limit`.
  //   Cek `tipe` juga (bukan cuma `search`) karena query string kosong ('') dibuang oleh
  //   frontend (lihat toQueryString), jadi "belum mengetik apa-apa" tidak selalu terlihat
  //   sebagai `search` di sini — tanpa ini, pemilih ruangan yang belum diketik jatuh ke
  //   cabang default di bawah yang justru mengecualikan ruangan.
  // - `parentId` : anak langsung satu lokasi (dipakai buka-cabang pohon secara lambat).
  // - (default)  : gedung + lantai saja — selalu sedikit, aman dimuat penuh untuk pohon awal
  //   & pilihan induk lokasi. Ruangan (yang jumlahnya bisa ratusan) tidak pernah ikut di sini.
  findAll(query: QueryLocationDto = {}) {
    const include = { parent: { select: { id: true, nama: true, tipe: true } } } as const;

    if (query.search !== undefined || query.tipe !== undefined) {
      return this.prisma.location.findMany({
        where: {
          nama: query.search !== undefined ? { contains: query.search, mode: 'insensitive' } : undefined,
          tipe: query.tipe,
        },
        orderBy: { nama: 'asc' },
        take: query.limit ?? SEARCH_LIMIT_DEFAULT,
        include,
      });
    }

    if (query.parentId !== undefined) {
      return this.prisma.location.findMany({
        where: { parentId: query.parentId },
        orderBy: { nama: 'asc' },
        include,
      });
    }

    return this.prisma.location.findMany({
      where: { tipe: { not: LocationType.ruangan } },
      orderBy: [{ tipe: 'asc' }, { nama: 'asc' }],
      include,
    });
  }

  // Jumlah aset per lokasi (gedung/lantai/ruangan) untuk badge di pohon lokasi.
  // Dua query saja (bukan N+1): hitung aset per ruangan lewat groupBy, lalu
  // jumlahkan ke atas (ruangan -> lantai -> gedung) di memori pakai peta parentId
  // yang ringan (cuma id+parentId, bukan seluruh kolom lokasi).
  async getAssetCounts(): Promise<Record<string, number>> {
    const [grouped, allLocations] = await Promise.all([
      this.prisma.asset.groupBy({
        by: ['locationId'],
        where: { deletedAt: null, locationId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.location.findMany({ select: { id: true, parentId: true } }),
    ]);

    const parentOf = new Map(allLocations.map((l) => [l.id, l.parentId]));
    const counts: Record<string, number> = {};

    for (const g of grouped) {
      if (!g.locationId) continue;
      const count = g._count._all;
      counts[g.locationId] = (counts[g.locationId] ?? 0) + count;

      let parentId = parentOf.get(g.locationId);
      while (parentId) {
        counts[parentId] = (counts[parentId] ?? 0) + count;
        parentId = parentOf.get(parentId);
      }
    }

    return counts;
  }

  async findOne(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: { parent: { select: { id: true, nama: true, tipe: true } } },
    });
    if (!location) throw new NotFoundException('Lokasi tidak ditemukan');
    return location;
  }

  private async validateParent(tipe: LocationType, parentId: string | undefined) {
    const requiredParentType = REQUIRED_PARENT_TYPE[tipe];

    if (!requiredParentType) {
      if (parentId) throw new ConflictException(`${tipe} tidak boleh punya induk lokasi`);
      return;
    }

    if (!parentId) throw new ConflictException(`${tipe} wajib memiliki induk lokasi (${requiredParentType})`);

    const parent = await this.prisma.location.findUnique({ where: { id: parentId } });
    if (!parent) throw new NotFoundException('Induk lokasi tidak ditemukan');
    if (parent.tipe !== requiredParentType) {
      throw new ConflictException(`Induk lokasi untuk ${tipe} harus bertipe ${requiredParentType}`);
    }
  }

  private async assertNoDuplicateSibling(
    tipe: LocationType,
    parentId: string | undefined,
    nama: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.location.findFirst({
      where: {
        tipe,
        parentId: parentId ?? null,
        nama: { equals: nama, mode: 'insensitive' },
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    if (existing) {
      throw new ConflictException(`${TYPE_LABEL[tipe]} dengan nama "${nama}" sudah ada di induk lokasi ini`);
    }
  }

  private async assertChildrenCompatible(id: string, newTipe: LocationType) {
    const requiredChildType = REQUIRED_PARENT_TYPE_BY_PARENT[newTipe];
    const children = await this.prisma.location.findMany({ where: { parentId: id }, select: { tipe: true } });
    const incompatible = children.some((c) => c.tipe !== requiredChildType);
    if (incompatible) {
      throw new ConflictException(
        `Tipe lokasi tidak bisa diubah menjadi ${newTipe} karena masih memiliki sub-lokasi yang tidak sesuai`,
      );
    }
  }

  async create(dto: CreateLocationDto) {
    await this.validateParent(dto.tipe, dto.parentId);
    await this.assertNoDuplicateSibling(dto.tipe, dto.parentId, dto.nama);

    return this.prisma.location.create({
      data: {
        nama: dto.nama,
        tipe: dto.tipe,
        parentId: dto.parentId,
        qrToken: generateQrToken(),
      },
    });
  }

  async update(id: string, dto: UpdateLocationDto) {
    const current = await this.findOne(id);
    const tipe = dto.tipe ?? current.tipe;
    const parentId = dto.parentId !== undefined ? dto.parentId : (current.parentId ?? undefined);
    const nama = dto.nama ?? current.nama;

    await this.validateParent(tipe, parentId);
    await this.assertNoDuplicateSibling(tipe, parentId, nama, id);
    if (dto.tipe && dto.tipe !== current.tipe) {
      await this.assertChildrenCompatible(id, dto.tipe);
    }

    return this.prisma.location.update({
      where: { id },
      data: { nama: dto.nama, tipe: dto.tipe, parentId: dto.parentId },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.location.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Lokasi masih memiliki sub-lokasi atau aset, tidak bisa dihapus');
      }
      throw e;
    }
  }

  // Token baru bila kertas QR fisik rusak/pudar — URL lama otomatis tidak berlaku.
  async regenerateQrToken(id: string) {
    await this.findOne(id);
    return this.prisma.location.update({
      where: { id },
      data: { qrToken: generateQrToken() },
    });
  }

  // Menandai/membatalkan satu ruangan sebagai "Gudang" — tujuan default tombol
  // Masuk di Menu Warehouse (PRD 5.12). Hanya satu lokasi boleh isWarehouse=true
  // sekaligus, jadi menandai lokasi baru otomatis membatalkan yang lama.
  async setWarehouse(id: string) {
    const location = await this.findOne(id);
    if (location.tipe !== LocationType.ruangan) {
      throw new ConflictException('Hanya lokasi bertipe Ruangan yang bisa dijadikan Gudang');
    }

    if (location.isWarehouse) {
      return this.prisma.location.update({ where: { id }, data: { isWarehouse: false } });
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.location.updateMany({ where: { isWarehouse: true }, data: { isWarehouse: false } }),
      this.prisma.location.update({ where: { id }, data: { isWarehouse: true } }),
    ]);
    return updated;
  }
}
