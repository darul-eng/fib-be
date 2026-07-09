import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { CategoriesModule } from './categories/categories.module';
import { LocationsModule } from './locations/locations.module';
import { SettingsModule } from './settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 20 }]),
    PrismaModule,
    CategoriesModule,
    LocationsModule,
    SettingsModule,
    AuthModule,
    AssetsModule,
    // TODO Tahap 3+: MovementsModule, dst.
  ],
  controllers: [AppController],
})
export class AppModule {}
