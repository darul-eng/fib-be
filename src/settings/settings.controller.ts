import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma, UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import { SETTING_DTOS, type SettingKey } from './dto/set-setting.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

function isKnownSettingKey(key: string): key is SettingKey {
  return key in SETTING_DTOS;
}

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
  async set(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    if (!isKnownSettingKey(key)) {
      throw new BadRequestException(`Kunci pengaturan "${key}" tidak dikenal`);
    }

    const instance = plainToInstance(SETTING_DTOS[key], body);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw new BadRequestException(errors.flatMap((e) => Object.values(e.constraints ?? {})));
    }

    const value = JSON.parse(JSON.stringify(instance)) as Prisma.InputJsonValue;
    return this.settings.set(key, value, user.id);
  }
}
