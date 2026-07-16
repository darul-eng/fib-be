import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Publik: frontend memuat tema saat startup (mis. GET /api/settings/theme)
  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.developer)
  @Put(':key')
  set(@Param('key') key: string, @Body() body: unknown) {
    return this.settings.set(key, body as any);
  }
}
