

// import {
//   BadRequestException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { PrismaClient, users_role } from '@prisma/client';
// import * as bcrypt from 'bcrypt';
// import {
//   buildPaginationResponse,
//   parsePaginationQuery,
// } from 'src/common/helpers/pagination.helper';
// import { CreateUserDto } from 'src/user/dto/create-user.dto';
// import { UpdateMeDto } from 'src/user/dto/update-me.dto';
// import { UpdatePasswordDto } from 'src/user/dto/update-password.dto';
// import { UpdateUserDto } from 'src/user/dto/update-user.dto';

// @Injectable()
// export class UserService {
//   prisma = new PrismaClient();

//   private async getUserProfileById(userId: bigint) {
//     return this.prisma.users.findUnique({
//       where: { id: userId },
//       select: {
//         id: true,
//         full_name: true,
//         email: true,
//         role: true,
//         is_active: true,
//         avatar_url: true, 
//         created_at: true,
//         updated_at: true,

//         lecturers: {
//           select: {
//             id: true,
//             lecturer_code: true,
//             department: true,
//             phone: true,
//           },
//         },
//         students: {
//           select: {
//             id: true,
//             student_code: true,
//             phone: true,
//             class_id: true,
//             classes: {
//               select: { id: true, class_code: true, class_name: true },
//             },
//           },
//         },
//       },
//     });
//   }


//   // ================== SELF ==================
//   async getMe(userId: string) {
//     const user = await this.getUserProfileById(BigInt(userId));
//     if (!user) throw new NotFoundException('User không tồn tại');
//     return user;
//   }

//   async updateMe(userId: string, dto: UpdateMeDto) {
//     const id = BigInt(userId);

//     const existing = await this.prisma.users.findUnique({
//       where: { id },
//       select: { id: true, role: true },
//     });
//     if (!existing) throw new NotFoundException('User không tồn tại');

//     await this.prisma.users.update({
//       where: { id },
//       data: {
//         full_name: dto.full_name ?? undefined,
//         updated_at: new Date(),
//       },
//     });

//     // Update role-specific profile
//     if (existing.role === users_role.student) {
//       const studentData: any = {};
//       if (dto.phone !== undefined) studentData.phone = dto.phone;
//       if (dto.class_id !== undefined) {
//         studentData.class_id = dto.class_id ? BigInt(dto.class_id) : null;
//       }

//       // user.students là array → updateMany theo user_id
//       if (Object.keys(studentData).length) {
//         await this.prisma.students.updateMany({
//           where: { user_id: id },
//           data: studentData,
//         });
//       }
//     }

//     if (existing.role === users_role.lecturer) {
//       const lecturerData: any = {};
//       if (dto.phone !== undefined) lecturerData.phone = dto.phone;
//       if (dto.department !== undefined) lecturerData.department = dto.department;

//       if (Object.keys(lecturerData).length) {
//         await this.prisma.lecturers.updateMany({
//           where: { user_id: id },
//           data: lecturerData,
//         });
//       }
//     }

//     const user = await this.getUserProfileById(id);
//     return { message: 'Cập nhật hồ sơ thành công', user };
//   }

//   async updatePassword(userId: string, dto: UpdatePasswordDto) {
//     const id = BigInt(userId);

//     const user = await this.prisma.users.findUnique({
//       where: { id },
//       select: { id: true, password_hash: true },
//     });

//     if (!user) throw new NotFoundException('User không tồn tại');

//     const match = await bcrypt.compare(dto.old_password, user.password_hash);
//     if (!match) throw new BadRequestException('Mật khẩu cũ không đúng');

//     const newHash = await bcrypt.hash(dto.new_password, 10);

//     await this.prisma.users.update({
//       where: { id },
//       data: {
//         password_hash: newHash,
//         updated_at: new Date(),
//       },
//     });

//     return { message: 'Đổi mật khẩu thành công' };
//   }

//   // ==================== ADMIN ====================
//   async getAllUsers(page: number, limit: number) {
//     const { page: p, limit: l } = parsePaginationQuery({
//       page,
//       limit,
//       maxLimit: 50,
//     });
//     const skip = (p - 1) * l;

//     const [users, total] = await Promise.all([
//       this.prisma.users.findMany({
//         skip,
//         take: l,
//         orderBy: { created_at: 'desc' },
//         select: {
//           id: true,
//           full_name: true,
//           email: true,
//           role: true,
//           is_active: true,
//           created_at: true,
//           updated_at: true,
//         },
//       }),
//       this.prisma.users.count(),
//     ]);

//     return buildPaginationResponse(users, total, p, l);
//   }

//   async getUserById(id: string) {
//     const user = await this.getUserProfileById(BigInt(id));
//     if (!user) throw new NotFoundException('User không tồn tại');
//     return user;
//   }

//   async updateUser(id: string, dto: UpdateUserDto) {
//     const userId = BigInt(id);

//     const existing = await this.prisma.users.findUnique({
//       where: { id: userId },
//       select: { id: true, role: true },
//     });
//     if (!existing) throw new NotFoundException('User không tồn tại');

//     await this.prisma.users.update({
//       where: { id: userId },
//       data: {
//         full_name: dto.full_name ?? undefined,
//         email: dto.email ?? undefined,
//         is_active: dto.is_active ?? undefined,
//         updated_at: new Date(),
//       },
//     });

//     // update role-specific
//     if (existing.role === users_role.student) {
//       const studentData: any = {};
//       if (dto.phone !== undefined) studentData.phone = dto.phone;
//       if (dto.class_id !== undefined) {
//         studentData.class_id = dto.class_id ? BigInt(dto.class_id) : null;
//       }
//       if (Object.keys(studentData).length) {
//         await this.prisma.students.updateMany({
//           where: { user_id: userId },
//           data: studentData,
//         });
//       }
//     }

//     if (existing.role === users_role.lecturer) {
//       const lecturerData: any = {};
//       if (dto.phone !== undefined) lecturerData.phone = dto.phone;
//       if (dto.department !== undefined) lecturerData.department = dto.department;

//       if (Object.keys(lecturerData).length) {
//         await this.prisma.lecturers.updateMany({
//           where: { user_id: userId },
//           data: lecturerData,
//         });
//       }
//     }

//     const user = await this.getUserProfileById(userId);
//     return { message: 'Cập nhật tài khoản thành công', user };
//   }

//   async deleteUser(id: string) {
//     await this.getUserById(id);

//     await this.prisma.users.delete({
//       where: { id: BigInt(id) },
//     });

//     return { message: 'Xóa tài khoản thành công' };
//   }

//   async createUser(dto: CreateUserDto) {
//     const exists = await this.prisma.users.findUnique({
//       where: { email: dto.email },
//       select: { id: true },
//     });

//     if (exists) throw new BadRequestException('Email đã tồn tại');

//     const password_hash = await bcrypt.hash(dto.password, 10);

//     const user = await this.prisma.users.create({
//       data: {
//         full_name: dto.full_name,
//         email: dto.email,
//         password_hash,
//         role: dto.role,
//       },
//       select: { id: true, full_name: true, email: true, role: true },
//     });

//     if (dto.role === users_role.student) {
//       await this.prisma.students.create({
//         data: {
//           user_id: user.id,
//           student_code: dto.student_code ?? `STD${user.id}`,
//           phone: dto.phone ?? null,
//           class_id: dto.class_id ? BigInt(dto.class_id) : null,
//         },
//       });
//     }

//     if (dto.role === users_role.lecturer) {
//       await this.prisma.lecturers.create({
//         data: {
//           user_id: user.id,
//           lecturer_code: dto.lecturer_code ?? `LEC${user.id}`,
//           department: dto.department ?? null,
//           phone: dto.phone ?? null,
//         },
//       });
//     }

//     return {
//       message: 'Tạo người dùng thành công',
//       user,
//     };
//   }
// }

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, users_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { join } from 'path';

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

  private async getUserProfileById(userId: bigint) {
    return this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        is_active: true,
        avatar_url: true, // ✅ cần có trong schema.prisma + generate
        created_at: true,
        updated_at: true,

        lecturers: {
          select: {
            id: true,
            lecturer_code: true,
            department: true,
            phone: true,
          },
        },
        students: {
          select: {
            id: true,
            student_code: true,
            phone: true,
            class_id: true,
            classes: {
              select: { id: true, class_code: true, class_name: true },
            },
          },
        },
      },
    });
  }

  private safeUnlink(path: string) {
    try {
      if (fs.existsSync(path)) fs.unlinkSync(path);
    } catch {
      // ignore
    }
  }

  private getAvatarDiskPathFromUrl(url?: string | null) {
    if (!url) return null;
    if (!url.startsWith('/uploads/avatars/')) return null;
    const filename = url.replace('/uploads/avatars/', '');
    return join(process.cwd(), 'uploads', 'avatars', filename);
  }

  // ================== SELF ==================
  async getMe(userId: string) {
    const user = await this.getUserProfileById(BigInt(userId));
    if (!user) throw new NotFoundException('User không tồn tại');
    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const id = BigInt(userId);

    const existing = await this.prisma.users.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) throw new NotFoundException('User không tồn tại');

    await this.prisma.users.update({
      where: { id },
      data: {
        full_name: dto.full_name ?? undefined,
        updated_at: new Date(),
      },
    });

    // Role-specific update
    if (existing.role === users_role.student) {
      const data: any = {};
      if (dto.phone !== undefined) data.phone = dto.phone;
      if (dto.class_id !== undefined) {
        data.class_id = dto.class_id ? BigInt(dto.class_id) : null;
      }

      if (Object.keys(data).length) {
        await this.prisma.students.updateMany({
          where: { user_id: id },
          data,
        });
      }
    }

    if (existing.role === users_role.lecturer) {
      const data: any = {};
      if (dto.phone !== undefined) data.phone = dto.phone;
      if (dto.department !== undefined) data.department = dto.department;

      if (Object.keys(data).length) {
        await this.prisma.lecturers.updateMany({
          where: { user_id: id },
          data,
        });
      }
    }

    const user = await this.getUserProfileById(id);
    return { message: 'Cập nhật hồ sơ thành công', user };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const id = BigInt(userId);

    const user = await this.prisma.users.findUnique({
      where: { id },
      select: { id: true, password_hash: true },
    });
    if (!user) throw new NotFoundException('User không tồn tại');

    const match = await bcrypt.compare(dto.old_password, user.password_hash);
    if (!match) throw new BadRequestException('Mật khẩu cũ không đúng');

    const newHash = await bcrypt.hash(dto.new_password, 10);

    await this.prisma.users.update({
      where: { id },
      data: {
        password_hash: newHash,
        updated_at: new Date(),
      },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // ================== AVATAR (SELF) ==================
  async updateMyAvatar(userId: string, file: Express.Multer.File) {
    const id = BigInt(userId);

    const old = await this.prisma.users.findUnique({
      where: { id },
      select: { avatar_url: true },
    });
    if (!old) throw new NotFoundException('User không tồn tại');

    const newAvatarUrl = `/uploads/avatars/${file.filename}`;

    await this.prisma.users.update({
      where: { id },
      data: { avatar_url: newAvatarUrl, updated_at: new Date() },
    });

    // Xóa file cũ (nếu lưu local)
    const oldPath = this.getAvatarDiskPathFromUrl(old.avatar_url);
    if (oldPath) this.safeUnlink(oldPath);

    const user = await this.getUserProfileById(id);
    return { message: 'Cập nhật avatar thành công', user };
  }

  async removeMyAvatar(userId: string) {
    const id = BigInt(userId);

    const old = await this.prisma.users.findUnique({
      where: { id },
      select: { avatar_url: true },
    });
    if (!old) throw new NotFoundException('User không tồn tại');

    await this.prisma.users.update({
      where: { id },
      data: { avatar_url: null, updated_at: new Date() },
    });

    const oldPath = this.getAvatarDiskPathFromUrl(old.avatar_url);
    if (oldPath) this.safeUnlink(oldPath);

    const user = await this.getUserProfileById(id);
    return { message: 'Đã xoá avatar', user };
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
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true,
          is_active: true,
          avatar_url: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.users.count(),
    ]);

    return buildPaginationResponse(users, total, p, l);
  }

  async getUserById(id: string) {
    const user = await this.getUserProfileById(BigInt(id));
    if (!user) throw new NotFoundException('User không tồn tại');
    return user;
  }

  /**
   * Admin update user (có thể đổi role)
   * - Nếu đổi role: tự tạo/xóa bản ghi students/lecturers tương ứng để tránh dữ liệu lệch.
   */
  async updateUser(id: string, dto: UpdateUserDto) {
    const userId = BigInt(id);

    const existing = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        students: { select: { id: true } },
        lecturers: { select: { id: true } },
      },
    });
    if (!existing) throw new NotFoundException('User không tồn tại');

    // 1) update users base fields
    const nextRole = dto.role ?? existing.role;

    await this.prisma.users.update({
      where: { id: userId },
      data: {
        full_name: dto.full_name ?? undefined,
        email: dto.email ?? undefined,
        role: nextRole,
        is_active: dto.is_active ?? undefined,
        updated_at: new Date(),
      },
    });

    // 2) handle role change + role-specific update
    const roleChanged = dto.role && dto.role !== existing.role;

    // If role changed -> clean/create profiles
    if (roleChanged) {
      // nếu chuyển sang admin: xóa hết profile
      if (nextRole === users_role.admin) {
        await this.prisma.lecturers.deleteMany({ where: { user_id: userId } });
        await this.prisma.students.deleteMany({ where: { user_id: userId } });
      }

      if (nextRole === users_role.student) {
        // xóa lecturer nếu có
        await this.prisma.lecturers.deleteMany({ where: { user_id: userId } });

        // đảm bảo có student profile
        const hasStudent = (existing.students?.length ?? 0) > 0;
        if (!hasStudent) {
          await this.prisma.students.create({
            data: {
              user_id: userId,
              student_code: `STD${userId.toString()}`,
              phone: dto.phone ?? null,
              class_id: dto.class_id ? BigInt(dto.class_id) : null,
            },
          });
        }
      }

      if (nextRole === users_role.lecturer) {
        // xóa student nếu có
        await this.prisma.students.deleteMany({ where: { user_id: userId } });

        // đảm bảo có lecturer profile
        if (!existing.lecturers) {
          await this.prisma.lecturers.create({
            data: {
              user_id: userId,
              lecturer_code: `LEC${userId.toString()}`,
              department: dto.department ?? null,
              phone: dto.phone ?? null,
            },
          });
        }
      }
    }

    // Nếu không đổi role (hoặc đổi role xong vẫn muốn update field)
    if (nextRole === users_role.student) {
      const data: any = {};
      if (dto.phone !== undefined) data.phone = dto.phone;
      if (dto.class_id !== undefined) data.class_id = dto.class_id ? BigInt(dto.class_id) : null;

      if (Object.keys(data).length) {
        await this.prisma.students.updateMany({
          where: { user_id: userId },
          data,
        });
      }
    }

    if (nextRole === users_role.lecturer) {
      const data: any = {};
      if (dto.phone !== undefined) data.phone = dto.phone;
      if (dto.department !== undefined) data.department = dto.department;

      if (Object.keys(data).length) {
        await this.prisma.lecturers.updateMany({
          where: { user_id: userId },
          data,
        });
      }
    }

    const user = await this.getUserProfileById(userId);
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
      where: { email: dto.email },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Email đã tồn tại');

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        full_name: dto.full_name,
        email: dto.email,
        password_hash,
        role: dto.role,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        avatar_url: true,
      },
    });

    if (dto.role === users_role.student) {
      await this.prisma.students.create({
        data: {
          user_id: user.id,
          student_code: dto.student_code ?? `STD${user.id}`,
          phone: dto.phone ?? null,
          class_id: dto.class_id ? BigInt(dto.class_id) : null,
        },
      });
    }

    if (dto.role === users_role.lecturer) {
      await this.prisma.lecturers.create({
        data: {
          user_id: user.id,
          lecturer_code: dto.lecturer_code ?? `LEC${user.id}`,
          department: dto.department ?? null,
          phone: dto.phone ?? null,
        },
      });
    }

    return {
      message: 'Tạo người dùng thành công',
      user,
    };
  }
}
