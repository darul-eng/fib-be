import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MovementsService } from './movements.service';
import { MoveAssetDto, QueryMovementDto } from './dto/move-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Get()
  findAll(@Query() query: QueryMovementDto) {
    return this.movements.findAll(query);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Post()
  move(@Body() dto: MoveAssetDto, @CurrentUser() user: AuthUser) {
    return this.movements.move(dto, user.id);
  }
}
