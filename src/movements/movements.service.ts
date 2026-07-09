import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { PeopleService } from '../assets/people.service';
import { MoveAssetDto, QueryMovementDto } from './dto/move-asset.dto';

const MOVEMENT_INCLUDE = {
  asset: { select: { id: true, kode: true, nama: true } },
  fromLocation: { select: { id: true, nama: true } },
  toLocation: { select: { id: true, nama: true } },
  fromPerson: { select: { id: true, nama: true } },
  toPerson: { select: { id: true, nama: true } },
  movedBy: { select: { id: true, nama: true } },
} satisfies Prisma.MovementInclude;

@Injectable()
export class MovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
    private readonly people: PeopleService,
  ) {}

  async findAll(query: QueryMovementDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const where: Prisma.MovementWhereInput = { assetId: query.assetId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movement.findMany({
        where,
        include: MOVEMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movement.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // Aksi "Pindahkan aset": satu baris Movement per aksi, mencakup lokasi/pemegang/
  // kondisi mana pun yang berubah sekaligus. `tipe` menandai perubahan utama
  // (prioritas lokasi > pemegang > kondisi) — kolom from/to lain tetap terisi.
  async move(dto: MoveAssetDto, userId: string) {
    const asset = await this.assets.findOne(dto.assetId);

    if (dto.locationId) {
      const location = await this.prisma.location.findUnique({ where: { id: dto.locationId } });
      if (!location) throw new BadRequestException('Lokasi tidak ditemukan');
    }

    const newPerson =
      dto.holderName !== undefined
        ? dto.holderName
          ? await this.people.resolveByName(dto.holderName)
          : null
        : undefined;

    const locationChanged = dto.locationId !== undefined && dto.locationId !== asset.locationId;
    const personChanged = newPerson !== undefined && (newPerson?.id ?? null) !== asset.personId;
    const kondisiChanged = dto.kondisi !== undefined && dto.kondisi !== asset.kondisi;

    if (!locationChanged && !personChanged && !kondisiChanged) {
      throw new BadRequestException('Tidak ada perubahan lokasi, pemegang, atau kondisi');
    }

    const tipe = locationChanged ? 'lokasi' : personChanged ? 'pemegang' : 'kondisi';

    const [movement, updatedAsset] = await this.prisma.$transaction([
      this.prisma.movement.create({
        data: {
          assetId: asset.id,
          tipe,
          fromLocationId: locationChanged ? asset.locationId : undefined,
          toLocationId: locationChanged ? dto.locationId : undefined,
          fromPersonId: personChanged ? asset.personId : undefined,
          toPersonId: personChanged ? (newPerson?.id ?? null) : undefined,
          fromKondisi: kondisiChanged ? asset.kondisi : undefined,
          toKondisi: kondisiChanged ? dto.kondisi : undefined,
          movedById: userId,
          catatan: dto.catatan,
        },
        include: MOVEMENT_INCLUDE,
      }),
      this.prisma.asset.update({
        where: { id: asset.id },
        data: {
          locationId: locationChanged ? dto.locationId : undefined,
          personId: personChanged ? (newPerson?.id ?? null) : undefined,
          kondisi: kondisiChanged ? dto.kondisi : undefined,
        },
        include: {
          category: { include: { fields: { orderBy: { urutan: 'asc' } } } },
          location: true,
          person: true,
        },
      }),
    ]);

    return { asset: updatedAsset, movement };
  }
}
