import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService } from './audit.service';
import { FinishAuditDto, ManualCheckDto, MoveHereDto, ScanAuditDto, StartAuditDto } from './dto/audit.dto';
import { QueryAuditSessionDto } from './dto/query-audit-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

// Stok opname / audit ruangan (Tahap 7) — seluruhnya aksi admin, konsisten dengan
// mutasi & CRUD aset/lokasi yang juga dibatasi ke peran admin.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('audit-sessions')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(@Query() query: QueryAuditSessionDto) {
    return this.audit.findAllSessions(query);
  }

  @Post()
  start(@Body() dto: StartAuditDto, @CurrentUser() user: AuthUser) {
    return this.audit.startOrResume(dto.locationId, user.id);
  }

  @Get(':id')
  getView(@Param('id') id: string) {
    return this.audit.getView(id);
  }

  @Post(':id/scan')
  scan(@Param('id') id: string, @Body() dto: ScanAuditDto, @CurrentUser() user: AuthUser) {
    return this.audit.scan(id, dto.token, user.id);
  }

  @Post(':id/manual')
  manualCheck(@Param('id') id: string, @Body() dto: ManualCheckDto, @CurrentUser() user: AuthUser) {
    return this.audit.manualCheck(id, dto.assetId, user.id);
  }

  @Post(':id/move-here')
  moveHere(@Param('id') id: string, @Body() dto: MoveHereDto, @CurrentUser() user: AuthUser) {
    return this.audit.moveHere(id, dto.assetId, user.id);
  }

  @Post(':id/finish')
  finish(@Param('id') id: string, @Body() dto: FinishAuditDto) {
    return this.audit.finish(id, dto.catatan);
  }
}
