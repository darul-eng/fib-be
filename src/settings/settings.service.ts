import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Pengaturan "${key}" tidak ditemukan`);
    return setting.value;
  }

  // Upsert nilai pengaturan. Untuk tema: value = { primary, primaryDark, accent, ... }
  async set(key: string, value: Prisma.InputJsonValue) {
    const setting = await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return setting.value;
  }
}
