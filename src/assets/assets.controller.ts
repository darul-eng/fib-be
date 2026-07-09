import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { AssetsService } from './assets.service';
import { AssetsImportService } from './assets-import.service';
import { CreateAssetDto, DuplicateAssetDto, UpdateAssetDto } from './dto/create-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { ImportCommitDto } from './dto/import-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assets: AssetsService,
    private readonly importService: AssetsImportService,
  ) {}

  @Get()
  findAll(@Query() query: QueryAssetDto) {
    return this.assets.findAll(query);
  }

  @Get('import/template')
  async downloadTemplate(
    @Query('categoryId') categoryId: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.importService.buildTemplate(categoryId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-import-aset.xlsx"',
    });
    res.send(buffer);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.assets.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser) {
    return this.assets.create(dto, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.assets.remove(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Post(':id/duplicate')
  duplicate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DuplicateAssetDto) {
    return this.assets.duplicate(id, dto.jumlah);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Post(':id/regenerate-token')
  regenerateToken(@Param('id', ParseUUIDPipe) id: string) {
    return this.assets.regenerateQrToken(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'assets'),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: PHOTO_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!PHOTO_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Tipe file harus JPEG, PNG, atau WebP'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File foto wajib diunggah');
    return this.assets.updatePhoto(id, `/uploads/assets/${file.filename}`);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File wajib diunggah');
    return this.importService.preview(file.buffer);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  @Post('import/commit')
  async importCommit(@Body() dto: ImportCommitDto, @CurrentUser() user: AuthUser) {
    const created: Awaited<ReturnType<AssetsService['create']>>[] = [];
    const failed: { row: number; message: string }[] = [];

    for (const [index, row] of dto.rows.entries()) {
      try {
        created.push(await this.assets.create(row, user.id));
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Gagal menyimpan baris';
        failed.push({ row: index + 1, message });
      }
    }

    return { created: created.length, failed };
  }
}
