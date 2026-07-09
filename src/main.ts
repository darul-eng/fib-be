import { join } from 'path';
import { mkdirSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  mkdirSync(join(process.cwd(), 'uploads', 'assets'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Validasi DTO otomatis
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // CORS untuk frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SIMAF API berjalan di http://localhost:${port}/api`);
}
bootstrap();
