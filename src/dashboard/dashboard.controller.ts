import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  stats(@Query() query: QueryDashboardDto) {
    return this.dashboard.stats(query);
  }

  @Get('export')
  async export(@Query() query: QueryDashboardDto, @Res() res: Response) {
    const buffer = await this.dashboard.exportExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="laporan-aset.xlsx"',
    });
    res.send(buffer);
  }
}
