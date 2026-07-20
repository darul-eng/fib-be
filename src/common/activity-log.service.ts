import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  record(params: {
    userId: string;
    aksi: string;
    entitas: string;
    entitasId?: string;
    detail?: Prisma.InputJsonValue;
  }): Promise<unknown> {
    return this.prisma.activityLog.create({
      data: {
        userId: params.userId,
        aksi: params.aksi,
        entitas: params.entitas,
        entitasId: params.entitasId,
        detail: params.detail,
      },
    });
  }
}
