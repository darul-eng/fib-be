import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, LocationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto';
import { generateQrToken } from '../common/qr-token.util';

const REQUIRED_PARENT_TYPE: Record<LocationType, LocationType | null> = {
  gedung: null,
  lantai: LocationType.gedung,
  ruangan: LocationType.lantai,
};

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.location.findMany({
      orderBy: [{ tipe: 'asc' }, { nama: 'asc' }],
      include: { parent: { select: { id: true, nama: true, tipe: true } } },
    });
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

  async create(dto: CreateLocationDto) {
    await this.validateParent(dto.tipe, dto.parentId);

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

    await this.validateParent(tipe, parentId);

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
}
