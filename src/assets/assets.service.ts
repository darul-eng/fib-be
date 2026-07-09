import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PeopleService } from './people.service';
import { validateAttributes } from './attributes.util';
import { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { generateQrToken } from '../common/qr-token.util';

const ASSET_INCLUDE = {
  category: { include: { fields: { orderBy: { urutan: 'asc' as const } } } },
  location: true,
  person: true,
} satisfies Prisma.AssetInclude;

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
  ) {}

  async findAll(query: QueryAssetDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const where: Prisma.AssetWhereInput = {
      deletedAt: null,
      categoryId: query.categoryId,
      locationId: query.locationId,
      kondisi: query.kondisi,
      tahunBeli: query.tahunBeli,
      ...(query.search
        ? {
            OR: [
              { nama: { contains: query.search, mode: 'insensitive' } },
              { kode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: ASSET_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: ASSET_INCLUDE,
    });
    if (!asset) throw new NotFoundException('Aset tidak ditemukan');
    return asset;
  }

  async create(dto: CreateAssetDto, userId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      include: { fields: true },
    });
    if (!category) throw new BadRequestException('Kategori tidak ditemukan');

    if (dto.locationId) {
      const location = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
      if (!location) throw new BadRequestException('Lokasi tidak ditemukan');
    }

    const attributes = validateAttributes(category.fields, dto.attributes);
    const person = dto.holderName ? await this.people.resolveByName(dto.holderName) : null;
    const tahun = dto.tahunBeli ?? new Date().getFullYear();

    return this.createWithGeneratedCode({
      nama: dto.nama,
      categoryId: dto.categoryId,
      categoryNama: category.nama,
      kondisi: dto.kondisi,
      tahunBeli: tahun,
      hargaBeli: dto.hargaBeli,
      sumberDana: dto.sumberDana,
      locationId: dto.locationId,
      personId: person?.id,
      attributes,
      createdById: userId,
    });
  }

  async update(id: string, dto: UpdateAssetDto) {
    const existing = await this.findOne(id);
    const categoryId = dto.categoryId ?? existing.categoryId;

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { fields: true },
    });
    if (!category) throw new BadRequestException('Kategori tidak ditemukan');

    const attributes =
      dto.attributes !== undefined
        ? validateAttributes(category.fields, dto.attributes)
        : undefined;

    return this.prisma.asset.update({
      where: { id },
      data: {
        nama: dto.nama,
        categoryId: dto.categoryId,
        tahunBeli: dto.tahunBeli,
        hargaBeli: dto.hargaBeli,
        sumberDana: dto.sumberDana,
        attributes: attributes as Prisma.InputJsonValue | undefined,
      },
      include: ASSET_INCLUDE,
    });
  }

  async updatePhoto(id: string, fotoPath: string) {
    await this.findOne(id);
    return this.prisma.asset.update({ where: { id }, data: { fotoPath }, include: ASSET_INCLUDE });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date(), kondisi: 'dihapus' },
    });
  }

  // Token baru bila kertas QR fisik rusak/pudar — URL lama otomatis tidak berlaku.
  async regenerateQrToken(id: string) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: { qrToken: generateQrToken() },
      include: ASSET_INCLUDE,
    });
  }

  async duplicate(id: string, jumlah: number) {
    const source = await this.findOne(id);
    const created: Awaited<ReturnType<typeof this.createWithGeneratedCode>>[] = [];

    for (let i = 0; i < jumlah; i++) {
      const asset = await this.createWithGeneratedCode({
        nama: source.nama,
        categoryId: source.categoryId,
        categoryNama: source.category.nama,
        kondisi: 'baik',
        tahunBeli: source.tahunBeli ?? new Date().getFullYear(),
        hargaBeli: source.hargaBeli ? Number(source.hargaBeli) : undefined,
        sumberDana: source.sumberDana ?? undefined,
        locationId: source.locationId ?? undefined,
        personId: source.personId ?? undefined,
        attributes: source.attributes as Record<string, unknown>,
        createdById: source.createdById ?? undefined,
      });
      created.push(asset);
    }

    return created;
  }

  // Generate kode aset unik: INV/FIB/{tahun}/{PREFIX}-{urutan}. Retry sekali bila
  // bentrok (race condition input massal) — cukup untuk volume manual/batch kecil.
  private async createWithGeneratedCode(input: {
    nama: string;
    categoryId: string;
    categoryNama: string;
    kondisi?: CreateAssetDto['kondisi'];
    tahunBeli: number;
    hargaBeli?: number;
    sumberDana?: string;
    locationId?: string;
    personId?: string;
    attributes: Record<string, unknown>;
    createdById?: string;
  }) {
    const prefix = input.categoryNama.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 3) || 'AST';
    const codePrefix = `INV/FIB/${input.tahunBeli}/${prefix}-`;

    for (let attempt = 0; attempt < 3; attempt++) {
      const existingCount = await this.prisma.asset.count({
        where: { kode: { startsWith: codePrefix } },
      });
      const urutan = existingCount + 1 + attempt;
      const kode = `${codePrefix}${String(urutan).padStart(2, '0')}`;

      try {
        return await this.prisma.asset.create({
          data: {
            kode,
            qrToken: generateQrToken(),
            nama: input.nama,
            categoryId: input.categoryId,
            kondisi: input.kondisi,
            tahunBeli: input.tahunBeli,
            hargaBeli: input.hargaBeli,
            sumberDana: input.sumberDana,
            locationId: input.locationId,
            personId: input.personId,
            attributes: input.attributes as Prisma.InputJsonValue,
            createdById: input.createdById,
          },
          include: ASSET_INCLUDE,
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          continue;
        }
        throw e;
      }
    }

    throw new BadRequestException('Gagal membuat kode aset unik, coba lagi');
  }
}
