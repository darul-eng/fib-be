import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

// Jaring pengaman terakhir: request yang lolos dari try/catch spesifik di service
// (mis. create() yang bentrok unique constraint karena race condition) tetap
// mendapat respons 409/404 yang rapi, bukan 500 mentah dari Nest.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'P2002') {
      const target = (exception.meta?.target as string[] | undefined)?.join(', ');
      const ex = new ConflictException(
        target ? `Data dengan ${target} ini sudah ada` : 'Data ini sudah ada',
      );
      response.status(ex.getStatus()).json(ex.getResponse());
      return;
    }

    if (exception.code === 'P2025') {
      const ex = new NotFoundException('Data tidak ditemukan');
      response.status(ex.getStatus()).json(ex.getResponse());
      return;
    }

    response.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan pada server' });
  }
}
