import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditItemResult, LocationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MovementsService } from '../movements/movements.service';
import { QueryAuditSessionDto } from './dto/query-audit-session.dto';

const ASSET_SELECT = { id: true, kode: true, nama: true } as const;

const EMPTY_COUNTS: Record<AuditItemResult, number> = {
  ditemukan: 0,
  tidak_ditemukan: 0,
  salah_ruangan: 0,
  belum_terdaftar: 0,
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: MovementsService,
  ) {}

  // Riwayat sesi audit (semua ruangan, atau satu ruangan bila `locationId` diberikan) —
  // tiap baris disertai ringkasan hasil per sesi tanpa perlu buka detail satu-satu.
  async findAllSessions(query: QueryAuditSessionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.AuditSessionWhereInput = { locationId: query.locationId };

    const [sessions, total] = await this.prisma.$transaction([
      this.prisma.auditSession.findMany({
        where,
        include: {
          location: { select: { id: true, nama: true } },
          user: { select: { id: true, nama: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditSession.count({ where }),
    ]);

    const sessionIds = sessions.map((s) => s.id);
    const itemCounts = sessionIds.length
      ? await this.prisma.auditItem.groupBy({
          by: ['auditSessionId', 'result'],
          where: { auditSessionId: { in: sessionIds } },
          _count: { _all: true },
        })
      : [];

    const countsBySession = new Map<string, Record<AuditItemResult, number>>();
    for (const row of itemCounts) {
      const current = countsBySession.get(row.auditSessionId) ?? { ...EMPTY_COUNTS };
      current[row.result] = row._count._all;
      countsBySession.set(row.auditSessionId, current);
    }

    const data = sessions.map((s) => ({
      id: s.id,
      locationId: s.locationId,
      locationNama: s.location.nama,
      conductedByNama: s.user?.nama ?? null,
      status: s.status,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      counts: countsBySession.get(s.id) ?? { ...EMPTY_COUNTS },
    }));

    return { data, total, page, limit };
  }

  // "Mulai Audit": bila ruangan sudah punya sesi berjalan, admin melanjutkan sesi itu
  // (bukan sesi ganda) — sederhana & cukup untuk kasus refresh halaman / lanjut nanti.
  async startOrResume(locationId: string, userId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundException('Lokasi tidak ditemukan');
    if (location.tipe !== LocationType.ruangan) {
      throw new BadRequestException('Audit hanya bisa dilakukan pada lokasi bertipe ruangan');
    }

    let session = await this.prisma.auditSession.findFirst({
      where: { locationId, status: 'berjalan' },
    });
    if (!session) {
      session = await this.prisma.auditSession.create({
        data: { locationId, conductedBy: userId },
      });
    }

    return this.buildView(session.id);
  }

  async getView(sessionId: string) {
    return this.buildView(sessionId);
  }

  async scan(sessionId: string, token: string, userId: string) {
    const session = await this.getActiveSession(sessionId);

    const asset = await this.prisma.asset.findFirst({
      where: { qrToken: token, deletedAt: null },
      select: { ...ASSET_SELECT, locationId: true },
    });

    let lastResult: AuditItemResult;
    if (!asset) {
      const existing = await this.prisma.auditItem.findFirst({
        where: { auditSessionId: session.id, scannedToken: token, result: 'belum_terdaftar' },
      });
      if (!existing) {
        await this.prisma.auditItem.create({
          data: { auditSessionId: session.id, result: 'belum_terdaftar', scannedToken: token },
        });
      }
      lastResult = 'belum_terdaftar';
    } else {
      lastResult = asset.locationId === session.locationId ? 'ditemukan' : 'salah_ruangan';
      await this.upsertFoundOrMismatch(session.id, asset.id, lastResult, token);
    }

    return { ...(await this.buildView(session.id)), lastScan: { result: lastResult, assetNama: asset?.nama ?? null } };
  }

  async manualCheck(sessionId: string, assetId: string, userId: string) {
    const session = await this.getActiveSession(sessionId);
    void userId;

    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset) throw new NotFoundException('Aset tidak ditemukan');
    if (asset.locationId !== session.locationId) {
      throw new BadRequestException('Aset ini bukan bagian dari ruangan yang sedang diaudit');
    }

    await this.upsertFoundOrMismatch(session.id, asset.id, 'ditemukan', null);
    return this.buildView(session.id);
  }

  async moveHere(sessionId: string, assetId: string, userId: string) {
    const session = await this.getActiveSession(sessionId);

    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, deletedAt: null } });
    if (!asset) throw new NotFoundException('Aset tidak ditemukan');

    if (asset.locationId !== session.locationId) {
      await this.movements.move({ assetId: asset.id, locationId: session.locationId }, userId);
    }
    await this.upsertFoundOrMismatch(session.id, asset.id, 'ditemukan', null);
    return this.buildView(session.id);
  }

  async finish(sessionId: string, catatan: string | undefined) {
    const session = await this.getActiveSession(sessionId);

    const expectedAssets = await this.prisma.asset.findMany({
      where: { locationId: session.locationId, deletedAt: null },
      select: { id: true },
    });
    const foundItems = await this.prisma.auditItem.findMany({
      where: { auditSessionId: session.id, result: 'ditemukan' },
      select: { assetId: true },
    });
    const foundIds = new Set(foundItems.map((i) => i.assetId));
    const missing = expectedAssets.filter((a) => !foundIds.has(a.id));

    if (missing.length > 0) {
      await this.prisma.auditItem.createMany({
        data: missing.map((a) => ({
          auditSessionId: session.id,
          assetId: a.id,
          result: 'tidak_ditemukan' as const,
        })),
      });
    }

    await this.prisma.auditSession.update({
      where: { id: session.id },
      data: { status: 'selesai', finishedAt: new Date(), catatan },
    });

    return this.buildView(session.id);
  }

  private async getActiveSession(sessionId: string) {
    const session = await this.prisma.auditSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Sesi audit tidak ditemukan');
    if (session.status !== 'berjalan') throw new BadRequestException('Sesi audit sudah selesai');
    return session;
  }

  // Satu aset hanya boleh punya satu item per hasil (ditemukan/salah_ruangan) per sesi —
  // hindari duplikat saat aset yang sama discan berulang kali.
  private async upsertFoundOrMismatch(
    sessionId: string,
    assetId: string,
    result: Extract<AuditItemResult, 'ditemukan' | 'salah_ruangan'>,
    scannedToken: string | null,
  ) {
    const existing = await this.prisma.auditItem.findFirst({
      where: { auditSessionId: sessionId, assetId, result },
    });
    if (existing) return existing;
    return this.prisma.auditItem.create({
      data: { auditSessionId: sessionId, assetId, result, scannedToken },
    });
  }

  private async buildView(sessionId: string) {
    const session = await this.prisma.auditSession.findUnique({
      where: { id: sessionId },
      include: { location: { select: { id: true, nama: true } } },
    });
    if (!session) throw new NotFoundException('Sesi audit tidak ditemukan');

    const [expectedAssets, items] = await Promise.all([
      this.prisma.asset.findMany({
        where: { locationId: session.locationId, deletedAt: null },
        select: ASSET_SELECT,
        orderBy: { nama: 'asc' },
      }),
      this.prisma.auditItem.findMany({
        where: { auditSessionId: sessionId },
        include: { asset: { select: ASSET_SELECT } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const ditemukanIds = new Set(items.filter((i) => i.result === 'ditemukan').map((i) => i.assetId));
    const tidakDitemukanIds = new Set(items.filter((i) => i.result === 'tidak_ditemukan').map((i) => i.assetId));

    return {
      id: session.id,
      locationId: session.locationId,
      locationNama: session.location.nama,
      status: session.status,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      catatan: session.catatan,
      ditemukan: expectedAssets.filter((a) => ditemukanIds.has(a.id)),
      belumDicek: expectedAssets.filter((a) => !ditemukanIds.has(a.id) && !tidakDitemukanIds.has(a.id)),
      tidakDitemukan: expectedAssets.filter((a) => tidakDitemukanIds.has(a.id)),
      salahRuangan: items
        .filter((i) => i.result === 'salah_ruangan' && i.asset)
        .map((i) => ({ itemId: i.id, asset: i.asset! })),
      belumTerdaftar: items
        .filter((i) => i.result === 'belum_terdaftar')
        .map((i) => ({ itemId: i.id, scannedToken: i.scannedToken })),
    };
  }
}
