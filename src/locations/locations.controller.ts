import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  findAll(@Query() query: QueryLocationDto) {
    return this.locations.findAll(query);
  }

  @Get('asset-counts')
  getAssetCounts() {
    return this.locations.getAssetCounts();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locations.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Post()
  create(@Body() dto: CreateLocationDto, @CurrentUser() user: AuthUser) {
    return this.locations.create(dto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.locations.update(id, dto, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.locations.remove(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Post(':id/regenerate-token')
  regenerateToken(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.locations.regenerateQrToken(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @Post(':id/set-warehouse')
  setWarehouse(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.locations.setWarehouse(id, user.id);
  }
}
