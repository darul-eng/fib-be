import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovementsService } from '../movements/movements.service';

const DEFAULT_CATATAN_MASUK = 'Masuk Gudang (Menu Warehouse)';
const DEFAULT_CATATAN_KELUAR = 'Keluar Gudang (Menu Warehouse)';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: MovementsService,
  ) {}

  // Lokasi Gudang saat ini (ditandai admin lewat Locations.setWarehouse) — dipakai
  // sebagai tujuan tombol "Masuk" dan ditampilkan di header Menu Warehouse.
  async getGudang() {
    return this.prisma.location.findFirst({ where: { isWarehouse: true } });
  }

  private async findAssetByToken(qrToken: string) {
    const asset = await this.prisma.asset.findFirst({ where: { qrToken, deletedAt: null } });
    if (!asset) throw new NotFoundException('Aset tidak ditemukan');
    return asset;
  }

  private async requireGudang() {
    const gudang = await this.getGudang();
    if (!gudang) {
      throw new BadRequestException('Lokasi Gudang belum diatur. Hubungi admin untuk menandai satu ruangan sebagai Gudang.');
    }
    return gudang;
  }

  async masuk(qrToken: string, userId: string, catatan?: string) {
    const asset = await this.findAssetByToken(qrToken);
    const gudang = await this.requireGudang();

    try {
      return await this.movements.move(
        { assetId: asset.id, locationId: gudang.id, catatan: catatan ?? DEFAULT_CATATAN_MASUK },
        userId,
      );
    } catch (e) {
      if (e instanceof BadRequestException) throw new BadRequestException('Aset sudah berada di Gudang');
      throw e;
    }
  }

  async keluar(qrToken: string, locationId: string, userId: string, catatan?: string) {
    const asset = await this.findAssetByToken(qrToken);
    const destination = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!destination) throw new BadRequestException('Lokasi tujuan tidak ditemukan');

    try {
      return await this.movements.move(
        { assetId: asset.id, locationId, catatan: catatan ?? DEFAULT_CATATAN_KELUAR },
        userId,
      );
    } catch (e) {
      if (e instanceof BadRequestException) throw new BadRequestException('Aset sudah berada di lokasi tujuan tersebut');
      throw e;
    }
  }
}
