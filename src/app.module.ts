import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { CategoriesModule } from './categories/categories.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CategoriesModule,
    SettingsModule,
    // TODO Tahap 0: AuthModule (login manual + peran). Keycloak menyusul (Tahap 8).
    // TODO Tahap 1+: LocationsModule, AssetsModule, MovementsModule, dst.
  ],
  controllers: [AppController],
})
export class AppModule {}
