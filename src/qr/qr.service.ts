import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { PrintQrDto } from './dto/print-qr.dto';
import { AssetsService } from '../assets/assets.service';

type PrintLabelItem = {
  token: string;
  kind: 'a' | 'r';
  title: string;
  subtitle: string;
};

// Ukuran halaman A4 dalam point (pdfkit default: 72pt/inch).
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 24;

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly assets: AssetsService,
  ) {}

  buildPublicUrl(kind: 'a' | 'r', token: string): string {
    const base = this.config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/${kind}/${token}`;
  }

  // Error-correction level tinggi (H) agar tetap terbaca walau dicetak kecil / lecet.
  generatePng(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, { errorCorrectionLevel: 'H', margin: 1, width: 300 });
  }

  async getAssetQrPng(id: string): Promise<Buffer> {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) throw new BadRequestException('Aset tidak ditemukan');
    return this.generatePng(this.buildPublicUrl('a', asset.qrToken));
  }

  async getLocationQrPng(id: string): Promise<Buffer> {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new BadRequestException('Lokasi tidak ditemukan');
    return this.generatePng(this.buildPublicUrl('r', location.qrToken));
  }

  async buildPrintPdf(input: PrintQrDto): Promise<Buffer> {
    const items = await this.resolveItems(input);
    if (items.length === 0) throw new BadRequestException('Tidak ada item untuk dicetak');

    const columns = Math.min(4, Math.max(2, input.columns ?? 4));
    const qrSize = input.size === 'kecil' ? 32 : 42;

    return this.renderPdf(items, columns, qrSize);
  }

  private async resolveItems(input: PrintQrDto): Promise<PrintLabelItem[]> {
    const items: PrintLabelItem[] = [];

    if (input.assetIds?.length) {
      const assets = await this.prisma.asset.findMany({
        where: { id: { in: input.assetIds }, deletedAt: null },
        select: { kode: true, nama: true, qrToken: true },
      });
      for (const a of assets) {
        items.push({ token: a.qrToken, kind: 'a', title: a.nama, subtitle: a.kode });
      }
    }

    if (input.locationIds?.length) {
      const locations = await this.prisma.location.findMany({
        where: { id: { in: input.locationIds } },
        select: { nama: true, qrToken: true },
      });
      for (const l of locations) {
        items.push({ token: l.qrToken, kind: 'r', title: l.nama, subtitle: 'Ruangan' });
      }
    }

    if (input.assetLocationId) {
      const assets = await this.assets.findForPrintByLocation(input.assetLocationId);
      for (const a of assets) {
        items.push({ token: a.qrToken, kind: 'a', title: a.nama, subtitle: a.kode });
      }
    }

    return items;
  }

  // Label horizontal kecil: QR di kiri, 2 baris kode/nama di kanan (dipisah garis) —
  // meniru stiker inventaris fisik (kode klasifikasi di atas, kode aset di bawah).
  private async renderPdf(items: PrintLabelItem[], columns: number, qrSize: number): Promise<Buffer> {
    const gap = 6;
    const labelHeight = qrSize + 8;
    const cellWidth = (PAGE_WIDTH - PAGE_MARGIN * 2) / columns;
    const cellHeight = labelHeight + gap;
    const labelWidth = cellWidth - gap;
    const qrBoxWidth = labelHeight;
    const rowHeight = labelHeight / 2;
    const textX = qrBoxWidth + 3;
    const textWidth = labelWidth - qrBoxWidth - 6;

    const rowsPerPage = Math.max(1, Math.floor((PAGE_HEIGHT - PAGE_MARGIN * 2) / cellHeight));
    const perPage = columns * rowsPerPage;

    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const posInPage = i % perPage;
      if (i > 0 && posInPage === 0) doc.addPage();

      const col = posInPage % columns;
      const row = Math.floor(posInPage / columns);
      const x = PAGE_MARGIN + col * cellWidth;
      const y = PAGE_MARGIN + row * cellHeight;

      // Kotak label (garis potong sekaligus bingkai stiker).
      doc.lineWidth(0.75).rect(x, y, labelWidth, labelHeight).stroke('#0f172a');
      // Pembatas vertikal antara QR dan teks.
      doc
        .moveTo(x + qrBoxWidth, y)
        .lineTo(x + qrBoxWidth, y + labelHeight)
        .stroke('#0f172a');
      // Pembatas horizontal antara 2 baris teks.
      doc
        .moveTo(x + qrBoxWidth, y + rowHeight)
        .lineTo(x + labelWidth, y + rowHeight)
        .stroke('#0f172a');

      const png = await this.generatePng(this.buildPublicUrl(item.kind, item.token));
      const qrX = x + (qrBoxWidth - qrSize) / 2;
      const qrY = y + (labelHeight - qrSize) / 2;
      doc.image(png, qrX, qrY, { width: qrSize, height: qrSize });

      doc
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .fillColor('#0f172a')
        .text(item.subtitle, x + textX, y + (rowHeight - 6.5) / 2, {
          width: textWidth,
          height: rowHeight,
          align: 'center',
          ellipsis: true,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .fillColor('#0f172a')
        .text(item.title, x + textX, y + rowHeight + (rowHeight - 6.5) / 2, {
          width: textWidth,
          height: rowHeight,
          align: 'center',
          ellipsis: true,
        });
    }

    doc.end();
    return done;
  }
}
