import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaClient, users_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginAuthDto } from './dto/login-auth.dto';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';
import { JwtPayload } from 'src/types/jwt-payload.type';
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  prisma = new PrismaClient();

  // ***************************** TẠO TÀI KHOẢN *****************************
//   async signup(dto: CreateAuthDto) {
//     const exists = await this.prisma.users.findUnique({
//       where: { email: dto.email },
//     });
//     if (exists) throw new BadRequestException('Email đã tồn tại');

//     const password_hash = await bcrypt.hash(dto.password, 10);

//     const user = await this.prisma.users.create({
//       data: {
//         full_name: dto.full_name,
//         email: dto.email,
//         password_hash,
//         role: dto.role,
//       }
//     })

//     // tạo student
//     if (dto.role === users_role.student) {
//       await this.prisma.students.create({
//         data: {
//           user_id: user.id,
//           student_code: dto.student_code ?? `STD${user.id}`,
//           phone: dto.phone ?? null,
//           class_id: dto.class_id ? BigInt(dto.class_id) : null,
//         }
//       })
//     }

//     // tạo lecturer
//     if (dto.role === users_role.lecturer) {
//       await this.prisma.lecturers.create({
//         data: {
//           user_id: user.id,
//           lecturer_code: dto.lecturer_code ?? `LEC${user.id}`,
//           department: dto.department ?? null,
//           phone: dto.phone ?? null,
//         }
//       })

//     return {
//       message: 'Tạo người dùng thành công',
//       user: {
//         id: user.id.toString(),
//         full_name: user.full_name,
//         email: user.email,
//         role: user.role,
//       },
//     };
//   }
// }

  // ***************************** ĐĂNG NHẬP *****************************
  async login(data: LoginAuthDto) {
    const user = await this.prisma.users.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Email không tồn tại');
    }

    const match = await bcrypt.compare(data.password, user.password_hash);
    if (!match) {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id.toString(),
        role: user.role,
      },
      ...tokens,
    };
  }

  // Tạo access + refresh token
  async generateTokens(
    id: string | bigint,
    email: string,
    role: users_role,
  ) {
    const payload: JwtPayload = {
      sub: id.toString(),
      email,
      role,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: '30s',
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    return { access_token, refresh_token };
  }

  // Xác thực refresh token
  async refreshToken(refreshToken: string) {
    try {
      const decoded = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        // { secret: process.env.JWT_SECRET } // nên set nếu bạn tách secret
      );

      // decoded.sub bây giờ chắc chắn là string
      return this.generateTokens(decoded.sub, decoded.email, decoded.role);
    } catch (err) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }
}
