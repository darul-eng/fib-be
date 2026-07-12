import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PublicService } from './public.service';

// Endpoint publik, read-only, tanpa login — rate-limited untuk cegah penyalahgunaan/scraping.
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('assets/:token')
  getAsset(@Param('token') token: string) {
    return this.publicService.getAssetByToken(token);
  }

  @Get('locations/:token')
  getLocation(@Param('token') token: string) {
    return this.publicService.getLocationByToken(token);
  }
}
