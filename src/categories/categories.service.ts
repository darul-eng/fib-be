import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';

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
                isPublic: f.isPublic ?? true,
                opsi: f.opsi ?? undefined,
                urutan: f.urutan ?? i,
              })),
            }
          : undefined,
      },
      include: { fields: true },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.fields) {
        await tx.categoryField.deleteMany({ where: { categoryId: id } });
      }
      return tx.category.update({
        where: { id },
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
                  isPublic: f.isPublic ?? true,
                  opsi: f.opsi ?? undefined,
                  urutan: f.urutan ?? i,
                })),
              }
            : undefined,
        },
        include: { fields: { orderBy: { urutan: 'asc' } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Kategori masih dipakai oleh aset, tidak bisa dihapus');
      }
      throw e;
    }
  }
}
