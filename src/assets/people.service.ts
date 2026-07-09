import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  // Cari orang dengan nama yang sama (case-insensitive), atau buat baru.
  // Pemegang bukan akun login (lihat PRD §3), cukup nama teks.
  async resolveByName(nama: string) {
    const trimmed = nama.trim();
    if (!trimmed) return null;

    const existing = await this.prisma.person.findFirst({
      where: { nama: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) return existing;

    return this.prisma.person.create({ data: { nama: trimmed } });
  }
}
