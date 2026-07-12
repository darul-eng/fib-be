import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { QrService } from './qr.service';
import { PrintQrDto } from './dto/print-qr.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('qr')
export class QrController {
  constructor(private readonly qr: QrService) {}

  @Get('assets/:id/png')
  async assetPng(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const png = await this.qr.getAssetQrPng(id);
    res.set({ 'Content-Type': 'image/png' });
    res.send(png);
  }

  @Get('locations/:id/png')
  async locationPng(@Param('id') id: string, @Res() res: Response) {
    const png = await this.qr.getLocationQrPng(id);
    res.set({ 'Content-Type': 'image/png' });
    res.send(png);
  }

  @Post('print')
  async print(@Body() dto: PrintQrDto, @Res() res: Response) {
    const pdf = await this.qr.buildPrintPdf(dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="label-qr.pdf"',
    });
    res.send(pdf);
  }
}
