import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, users_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  buildPaginationResponse,
  parsePaginationQuery,
} from 'src/common/helpers/pagination.helper';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateMeDto } from 'src/user/dto/update-me.dto';
import { UpdatePasswordDto } from 'src/user/dto/update-password.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
@Injectable()
export class UserService {
  prisma = new PrismaClient();

  // ================== SELF ==================
  async getMe(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user) throw new NotFoundException('User không tồn tại');
    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.users.update({
      where: { id: BigInt(userId) },
      data: {
        full_name: dto.full_name,
        updated_at: new Date(),
      },
    });
    return { message: 'Cập nhật hồ sơ thành công', user };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.users.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) throw new NotFoundException('User không tồn tại');

    const match = await bcrypt.compare(dto.old_password, user.password_hash);
    if (!match) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }

    const newHash = await bcrypt.hash(dto.new_password, 10);

    await this.prisma.users.update({
      where: { id: BigInt(userId) },
      data: {
        password_hash: newHash,
        updated_at: new Date(),
      },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ==================== ADMIN ====================
  async getAllUsers(page: number, limit: number) {
    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;
    const [users, total] = await Promise.all([
      this.prisma.users.findMany({
        skip,
        take: l,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.users.count(),
    ]);

    return buildPaginationResponse(users, total, p, l);
  }

  async getUserById(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) throw new NotFoundException('User không tồn tại');
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.users.update({
      where: { id: BigInt(id) },
      data: {
        full_name: dto.full_name,
        email: dto.email,
        role: dto.role,
        is_active: dto.is_active,
        updated_at: new Date(),
      },
    });

    return { message: 'Cập nhật tài khoản thành công', user };
  }

  async deleteUser(id: string) {
    await this.getUserById(id);

    await this.prisma.users.delete({
      where: { id: BigInt(id) },
    });

    return { message: 'Xóa tài khoản thành công' };
  }

  async createUser(dto: CreateUserDto) {
    const exists = await this.prisma.users.findUnique({
      where: { email: dto.email }
    })

    if (exists) throw new BadRequestException('Email đã tồn tại')

    const password_hash = await bcrypt.hash(dto.password, 10)

    // user chung
    const user = await this.prisma.users.create({
      data: {
        full_name: dto.full_name,
        email: dto.email,
        password_hash,
        role: dto.role,
      }
    })

    // tạo student
    if (dto.role === users_role.student) {
      await this.prisma.students.create({
        data: {
          user_id: user.id,
          student_code: dto.student_code ?? `STD${user.id}`,
          phone: dto.phone ?? null,
          class_id: dto.class_id ? BigInt(dto.class_id) : null,
        }
      })
    }

    // tạo lecturer
    if (dto.role === users_role.lecturer) {
      await this.prisma.lecturers.create({
        data: {
          user_id: user.id,
          lecturer_code: dto.lecturer_code ?? `LEC${user.id}`,
          department: dto.department ?? null,
          phone: dto.phone ?? null,
        }
      })
    }

    return {
      message: 'Tạo người dùng thành công',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      }
    }
  }
}
