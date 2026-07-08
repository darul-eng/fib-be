import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Publik: frontend memuat tema saat startup (mis. GET /api/settings/theme)
  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(key);
  }

  // TODO: batasi ke peran admin setelah AuthModule siap (Tahap 0).
  @Put(':key')
  set(@Param('key') key: string, @Body() body: unknown) {
    return this.settings.set(key, body as any);
  }
}
