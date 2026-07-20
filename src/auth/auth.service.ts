import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export type SafeUser = {
  id: string;
  nama: string;
  username: string | null;
  email: string | null;
  role: string;
};

function toSafeUser(user: {
  id: string;
  nama: string;
  username: string | null;
  email: string | null;
  role: string;
}): SafeUser {
  return {
    id: user.id,
    nama: user.nama,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string; user: SafeUser }> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    const valid =
      user?.passwordHash && (await bcrypt.compare(dto.password, user.passwordHash));

    await this.prisma.activityLog.create({
      data: {
        userId: user?.id,
        aksi: valid ? 'login_success' : 'login_failed',
        entitas: 'user',
        entitasId: user?.id,
        detail: { username: dto.username },
      },
    });

    if (!user || !valid) {
      throw new UnauthorizedException('Username atau password salah');
    }
    if (user.status !== 'aktif') {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.jwt.sign({ sub: user.id, role: user.role });
    return { token, user: toSafeUser(user) };
  }

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) throw new ConflictException('Username sudah digunakan');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        nama: dto.nama,
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
    });
    return toSafeUser(user);
  }

  // Self-service: user harus membuktikan tahu password lamanya sebelum diganti.
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.passwordHash) {
      throw new BadRequestException('Akun ini login via Keycloak, password tidak bisa diubah di sini');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Password saat ini salah');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.prisma.activityLog.create({
      data: { userId, aksi: 'password_changed', entitas: 'user', entitasId: userId },
    });
  }

  // Admin mengatur ulang password user lain — tidak perlu tahu password lama
  // karena dilakukan oleh pihak yang sudah terverifikasi berwenang (role admin).
  async resetPassword(
    targetUserId: string,
    dto: ResetPasswordDto,
    actingAdminId: string,
  ): Promise<void> {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('Pengguna tidak ditemukan');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: targetUserId }, data: { passwordHash } });
    await this.prisma.activityLog.create({
      data: {
        userId: actingAdminId,
        aksi: 'password_reset_by_admin',
        entitas: 'user',
        entitasId: targetUserId,
      },
    });
  }

  async me(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return toSafeUser(user);
  }

  async listUsers(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { nama: 'asc' },
    });
    return users.map(toSafeUser);
  }
}
