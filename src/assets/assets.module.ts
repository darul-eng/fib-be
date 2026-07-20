import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetsImportService } from './assets-import.service';
import { PeopleService } from './people.service';
import { AssetPhotoService } from './asset-photo.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, AssetsImportService, PeopleService, AssetPhotoService],
  exports: [AssetsService, PeopleService],
})
export class AssetsModule {}
