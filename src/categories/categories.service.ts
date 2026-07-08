import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { nama: 'asc' },
      include: { fields: { orderBy: { urutan: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { fields: { orderBy: { urutan: 'asc' } } },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        nama: dto.nama,
        deskripsi: dto.deskripsi,
        fields: dto.fields
          ? {
              create: dto.fields.map((f, i) => ({
                label: f.label,
                key: f.key,
                tipe: f.tipe,
                wajib: f.wajib ?? false,
                opsi: f.opsi ?? undefined,
                urutan: f.urutan ?? i,
              })),
            }
          : undefined,
      },
      include: { fields: true },
    });
  }
}
