import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { WarehouseService } from './warehouse.service';
import { WarehouseKeluarDto, WarehouseMasukDto } from './dto/warehouse-scan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

// Menu Warehouse (PRD 5.12): dua tombol besar Masuk/Keluar untuk role `warehouse`.
// Admin juga diizinkan (mis. untuk uji coba/bantu di lapangan); role lain ditolak.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.warehouse)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouse: WarehouseService) {}

  @Get('gudang')
  getGudang() {
    return this.warehouse.getGudang();
  }

  @Post('masuk')
  masuk(@Body() dto: WarehouseMasukDto, @CurrentUser() user: AuthUser) {
    return this.warehouse.masuk(dto.qrToken, user.id, dto.catatan);
  }

  @Post('keluar')
  keluar(@Body() dto: WarehouseKeluarDto, @CurrentUser() user: AuthUser) {
    return this.warehouse.keluar(dto.qrToken, dto.locationId, user.id, dto.catatan);
  }
}
