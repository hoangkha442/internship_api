// import {
//   BadRequestException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { PrismaClient } from '@prisma/client';
// import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
// import {
//   parsePaginationQuery,
//   buildPaginationResponse,
// } from 'src/common/helpers/pagination.helper';
// import { CreateWorkLogDto } from './dto/create-worklog.dto';
// import { UpdateWorkLogDto } from './dto/update-worklog.dto';
// import { ReviewWorklogDto } from 'src/worklog/dto/review-worklog.dto';

// @Injectable()
// export class WorklogService {
//   prisma = new PrismaClient();

//   constructor(private readonly cloudinary: CloudinaryService) {}

//   async getStudentWorkLogs(
//     studentUserId: string,
//     internshipId: string,
//     page: number,
//     limit: number,
//   ) {
//     const student = await this.prisma.students.findFirst({
//       where: { user_id: BigInt(studentUserId) },
//       select: { id: true },
//     });
//     if (!student) throw new NotFoundException('Sinh viên không tồn tại');

//     const internship = await this.prisma.internships.findUnique({
//       where: { id: BigInt(internshipId) },
//       select: { id: true, student_id: true },
//     });
//     if (!internship) throw new NotFoundException('Không tìm thấy internship');
//     if (internship.student_id !== BigInt(student.id)) {
//       throw new BadRequestException(
//         'Bạn không có quyền xem worklog của internship này',
//       );
//     }

//     const { page: p, limit: l } = parsePaginationQuery({
//       page,
//       limit,
//       maxLimit: 50,
//     });
//     const skip = (p - 1) * l;

//     const [items, total] = await Promise.all([
//       this.prisma.work_logs.findMany({
//         where: { internship_id: BigInt(internshipId) },
//         skip,
//         take: l,
//         orderBy: [{ work_date: 'desc' }, { created_at: 'desc' }],
//         include: { work_log_attachments: true },
//       }),
//       this.prisma.work_logs.count({
//         where: { internship_id: BigInt(internshipId) },
//       }),
//     ]);

//     return buildPaginationResponse(items, total, p, l);
//   }

//   async createStudentWorkLog(
//     studentUserId: string,
//     dto: CreateWorkLogDto,
//     files: Express.Multer.File[] = [],
//   ) {
//     const student = await this.prisma.students.findFirst({
//       where: { user_id: BigInt(studentUserId) },
//       select: { id: true },
//     });
//     if (!student) throw new NotFoundException('Sinh viên không tồn tại');

//     const internship = await this.prisma.internships.findUnique({
//       where: { id: BigInt(dto.internship_id) },
//       select: { id: true, student_id: true },
//     });
//     if (!internship) throw new NotFoundException('Không tìm thấy internship');
//     if (internship.student_id !== BigInt(student.id)) {
//       throw new BadRequestException(
//         'Bạn không có quyền tạo worklog cho internship này',
//       );
//     }

//     return this.prisma.$transaction(async (tx) => {
//       const log = await tx.work_logs.create({
//         data: {
//           internship_id: BigInt(dto.internship_id),
//           work_date: new Date(dto.work_date),
//           content: dto.content,
//         },
//       });

//       // upload PUBLIC lên cloudinary
//       if (files.length) {
//         const uploaded = await Promise.all(
//           files.map((f) =>
//             this.cloudinary.uploadPublicFile(f, {
//               folder: `worklogs/${dto.internship_id}`,
//               // public_id để dễ quản lý: worklogs/<internshipId>/<timestamp>-<originalNameNoExt>
//               public_id: `worklogs/${dto.internship_id}/${Date.now()}-${(
//                 f.originalname || 'file'
//               )
//                 .replace(/\.[^/.]+$/, '')
//                 .replace(/[^\w\-]+/g, '-')}`,
//             }),
//           ),
//         );

//         await tx.work_log_attachments.createMany({
//           data: uploaded.map((u) => ({
//             work_log_id: log.id,
//             file_path: u.secure_url,
//             public_id: u.public_id,
//             description: null,
//           })),
//         });
//       }

//       const full = await tx.work_logs.findUnique({
//         where: { id: log.id },
//         include: { work_log_attachments: true },
//       });

//       return { message: 'Tạo worklog thành công', worklog: full };
//     });
//   }

//   async updateStudentWorkLog(
//     studentUserId: string,
//     workLogId: string,
//     dto: UpdateWorkLogDto,
//     files: Express.Multer.File[] = [],
//   ) {
//     const student = await this.prisma.students.findFirst({
//       where: { user_id: BigInt(studentUserId) },
//       select: { id: true },
//     });
//     if (!student) throw new NotFoundException('Sinh viên không tồn tại');

//     const log = await this.prisma.work_logs.findUnique({
//       where: { id: BigInt(workLogId) },
//       include: { internships: true, work_log_attachments: true },
//     });
//     if (!log) throw new NotFoundException('Worklog không tồn tại');

//     if (log.internships.student_id !== BigInt(student.id)) {
//       throw new BadRequestException('Bạn không có quyền sửa worklog này');
//     }
//     if (log.score !== null || (log.feedback && String(log.feedback).trim())) {
//       throw new BadRequestException(
//         'Worklog đã được giảng viên đánh giá, không thể chỉnh sửa',
//       );
//     }

//     return this.prisma.$transaction(async (tx) => {
//       const updated = await tx.work_logs.update({
//         where: { id: BigInt(workLogId) },
//         data: {
//           work_date: dto.work_date ? new Date(dto.work_date) : undefined,
//           content: dto.content ?? undefined,
//         },
//       });

//       // Nếu user gửi files mới => append (hoặc bạn muốn replace thì nói mình chỉnh)
//       if (files.length) {
//         const uploaded = await Promise.all(
//           files.map((f) =>
//             this.cloudinary.uploadPublicFile(f, {
//               folder: `worklogs/${log.internship_id.toString()}`,
//               public_id: `worklogs/${log.internship_id.toString()}/${Date.now()}-${(
//                 f.originalname || 'file'
//               )
//                 .replace(/\.[^/.]+$/, '')
//                 .replace(/[^\w\-]+/g, '-')}`,
//             }),
//           ),
//         );

//         await tx.work_log_attachments.createMany({
//           data: uploaded.map((u) => ({
//             work_log_id: updated.id,
//             file_path: u.secure_url,
//             public_id: u.public_id,
//             description: null,
//           })),
//         });
//       }

//       const full = await tx.work_logs.findUnique({
//         where: { id: updated.id },
//         include: { work_log_attachments: true },
//       });
//       return { message: 'Cập nhật worklog thành công', worklog: full };
//     });
//   }

//   async deleteStudentWorkLog(studentUserId: string, workLogId: string) {
//     const student = await this.prisma.students.findFirst({
//       where: { user_id: BigInt(studentUserId) },
//       select: { id: true },
//     });
//     if (!student) throw new NotFoundException('Sinh viên không tồn tại');

//     const log = await this.prisma.work_logs.findUnique({
//       where: { id: BigInt(workLogId) },
//       include: { internships: true, work_log_attachments: true },
//     });
//     if (!log) throw new NotFoundException('Worklog không tồn tại');

//     if (log.internships.student_id !== BigInt(student.id)) {
//       throw new BadRequestException('Bạn không có quyền xoá worklog này');
//     }
//     if (log.score !== null || (log.feedback && String(log.feedback).trim())) {
//       throw new BadRequestException(
//         'Worklog đã được giảng viên đánh giá, không thể xoá',
//       );
//     }

//     // xoá cloudinary trước
//     await Promise.all(
//       (log.work_log_attachments ?? [])
//         .filter((a) => a.public_id)
//         .map((a) => this.cloudinary.deleteByPublicId(a.public_id!)),
//     );

//     await this.prisma.work_logs.delete({ where: { id: BigInt(workLogId) } });
//     return { message: 'Xoá worklog thành công' };
//   }

//   async getLecturerWorklogs(
//     lecturerUserId: string,
//     internshipId: string,
//     page: number,
//     limit: number,
//   ) {
//     const lecturer = await this.prisma.lecturers.findFirst({
//       where: { user_id: BigInt(lecturerUserId) },
//       select: { id: true },
//     });
//     if (!lecturer) throw new NotFoundException('Giảng viên không tồn tại');

//     const internship = await this.prisma.internships.findUnique({
//       where: { id: BigInt(internshipId) },
//       select: { id: true, lecturer_id: true },
//     });
//     if (!internship) throw new NotFoundException('Không tìm thấy internship');
//     if (internship.lecturer_id !== BigInt(lecturer.id)) {
//       throw new BadRequestException('Bạn không hướng dẫn internship này');
//     }

//     const { page: p, limit: l } = parsePaginationQuery({
//       page,
//       limit,
//       maxLimit: 50,
//     });
//     const skip = (p - 1) * l;

//     const [items, total] = await Promise.all([
//       this.prisma.work_logs.findMany({
//         where: { internship_id: BigInt(internshipId) },
//         skip,
//         take: l,
//         orderBy: [{ work_date: 'desc' }, { created_at: 'desc' }],
//         include: { work_log_attachments: true },
//       }),
//       this.prisma.work_logs.count({
//         where: { internship_id: BigInt(internshipId) },
//       }),
//     ]);

//     return buildPaginationResponse(items, total, p, l);
//   }

//   async reviewWorklog(
//     lecturerUserId: string,
//     workLogId: string,
//     dto: ReviewWorklogDto,
//   ) {
//     const lecturer = await this.prisma.lecturers.findFirst({
//       where: { user_id: BigInt(lecturerUserId) },
//       select: { id: true },
//     });
//     if (!lecturer) throw new NotFoundException('Giảng viên không tồn tại');

//     const log = await this.prisma.work_logs.findUnique({
//       where: { id: BigInt(workLogId) },
//       include: { internships: true },
//     });
//     if (!log) throw new NotFoundException('Worklog không tồn tại');

//     if (log.internships.lecturer_id !== BigInt(lecturer.id)) {
//       throw new BadRequestException('Bạn không có quyền review worklog này');
//     }

//     const updated = await this.prisma.work_logs.update({
//       where: { id: BigInt(workLogId) },
//       data: {
//         score: dto.score ?? null,
//         feedback: dto.feedback ?? null,
//       },
//     });

//     return { message: 'Review worklog thành công', worklog: updated };
//   }
// }


import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import {
  parsePaginationQuery,
  buildPaginationResponse,
} from 'src/common/helpers/pagination.helper';
import { CreateWorkLogDto } from './dto/create-worklog.dto';
import { UpdateWorkLogDto } from './dto/update-worklog.dto';
import { ReviewWorklogDto } from 'src/worklog/dto/review-worklog.dto';

function baseNameNoExt(original: string) {
  return (original || 'file').replace(/\.[^/.]+$/, '');
}
function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

@Injectable()
export class WorklogService {
  prisma = new PrismaClient();

  constructor(private readonly cloudinary: CloudinaryService) {}

  async getStudentWorkLogs(
    studentUserId: string,
    internshipId: string,
    page: number,
    limit: number,
  ) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    const internship = await this.prisma.internships.findUnique({
      where: { id: BigInt(internshipId) },
      select: { id: true, student_id: true },
    });
    if (!internship) throw new NotFoundException('Không tìm thấy internship');
    if (internship.student_id !== BigInt(student.id)) {
      throw new BadRequestException(
        'Bạn không có quyền xem worklog của internship này',
      );
    }

    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.work_logs.findMany({
        where: { internship_id: BigInt(internshipId) },
        skip,
        take: l,
        orderBy: [{ work_date: 'desc' }, { created_at: 'desc' }],
        include: { work_log_attachments: true },
      }),
      this.prisma.work_logs.count({
        where: { internship_id: BigInt(internshipId) },
      }),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async createStudentWorkLog(
    studentUserId: string,
    dto: CreateWorkLogDto,
    files: Express.Multer.File[] = [],
  ) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    const internship = await this.prisma.internships.findUnique({
      where: { id: BigInt(dto.internship_id) },
      select: { id: true, student_id: true },
    });
    if (!internship) throw new NotFoundException('Không tìm thấy internship');
    if (internship.student_id !== BigInt(student.id)) {
      throw new BadRequestException(
        'Bạn không có quyền tạo worklog cho internship này',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const log = await tx.work_logs.create({
        data: {
          internship_id: BigInt(dto.internship_id),
          work_date: new Date(dto.work_date),
          content: dto.content,
        },
      });

      // upload PUBLIC lên cloudinary
      if (files.length) {
        const folder = `worklogs/${dto.internship_id}`;

        const uploaded = await Promise.all(
          files.map((f) =>
            this.cloudinary.uploadPublicFile(f, {
              folder,
              // ✅ public_id không kèm folder
              public_id: `${Date.now()}-${slugify(baseNameNoExt(f.originalname))}`,
            }),
          ),
        );

        await tx.work_log_attachments.createMany({
          data: uploaded.map((u) => ({
            work_log_id: log.id,
            file_path: u.secure_url,
            public_id: u.public_id,
            description: null,
          })),
        });
      }

      const full = await tx.work_logs.findUnique({
        where: { id: log.id },
        include: { work_log_attachments: true },
      });

      return { message: 'Tạo worklog thành công', worklog: full };
    });
  }

  async updateStudentWorkLog(
    studentUserId: string,
    workLogId: string,
    dto: UpdateWorkLogDto,
    files: Express.Multer.File[] = [],
  ) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    const log = await this.prisma.work_logs.findUnique({
      where: { id: BigInt(workLogId) },
      include: { internships: true, work_log_attachments: true },
    });
    if (!log) throw new NotFoundException('Worklog không tồn tại');

    if (log.internships.student_id !== BigInt(student.id)) {
      throw new BadRequestException('Bạn không có quyền sửa worklog này');
    }
    if (log.score !== null || (log.feedback && String(log.feedback).trim())) {
      throw new BadRequestException(
        'Worklog đã được giảng viên đánh giá, không thể chỉnh sửa',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.work_logs.update({
        where: { id: BigInt(workLogId) },
        data: {
          work_date: dto.work_date ? new Date(dto.work_date) : undefined,
          content: dto.content ?? undefined,
        },
      });

      // append files
      if (files.length) {
        const folder = `worklogs/${log.internship_id.toString()}`;

        const uploaded = await Promise.all(
          files.map((f) =>
            this.cloudinary.uploadPublicFile(f, {
              folder,
              public_id: `${Date.now()}-${slugify(baseNameNoExt(f.originalname))}`,
            }),
          ),
        );

        await tx.work_log_attachments.createMany({
          data: uploaded.map((u) => ({
            work_log_id: updated.id,
            file_path: u.secure_url,
            public_id: u.public_id,
            description: null,
          })),
        });
      }

      const full = await tx.work_logs.findUnique({
        where: { id: updated.id },
        include: { work_log_attachments: true },
      });
      return { message: 'Cập nhật worklog thành công', worklog: full };
    });
  }

  async deleteStudentWorkLog(studentUserId: string, workLogId: string) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    const log = await this.prisma.work_logs.findUnique({
      where: { id: BigInt(workLogId) },
      include: { internships: true, work_log_attachments: true },
    });
    if (!log) throw new NotFoundException('Worklog không tồn tại');

    if (log.internships.student_id !== BigInt(student.id)) {
      throw new BadRequestException('Bạn không có quyền xoá worklog này');
    }
    if (log.score !== null || (log.feedback && String(log.feedback).trim())) {
      throw new BadRequestException(
        'Worklog đã được giảng viên đánh giá, không thể xoá',
      );
    }

    // xoá cloudinary trước
    await Promise.all(
      (log.work_log_attachments ?? [])
        .filter((a) => a.public_id)
        .map((a) => this.cloudinary.deleteByPublicId(a.public_id!)),
    );

    await this.prisma.work_logs.delete({ where: { id: BigInt(workLogId) } });
    return { message: 'Xoá worklog thành công' };
  }

  async getLecturerWorklogs(
    lecturerUserId: string,
    internshipId: string,
    page: number,
    limit: number,
  ) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });
    if (!lecturer) throw new NotFoundException('Giảng viên không tồn tại');

    const internship = await this.prisma.internships.findUnique({
      where: { id: BigInt(internshipId) },
      select: { id: true, lecturer_id: true },
    });
    if (!internship) throw new NotFoundException('Không tìm thấy internship');
    if (internship.lecturer_id !== BigInt(lecturer.id)) {
      throw new BadRequestException('Bạn không hướng dẫn internship này');
    }

    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.work_logs.findMany({
        where: { internship_id: BigInt(internshipId) },
        skip,
        take: l,
        orderBy: [{ work_date: 'desc' }, { created_at: 'desc' }],
        include: { work_log_attachments: true },
      }),
      this.prisma.work_logs.count({
        where: { internship_id: BigInt(internshipId) },
      }),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async reviewWorklog(
    lecturerUserId: string,
    workLogId: string,
    dto: ReviewWorklogDto,
  ) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });
    if (!lecturer) throw new NotFoundException('Giảng viên không tồn tại');

    const log = await this.prisma.work_logs.findUnique({
      where: { id: BigInt(workLogId) },
      include: { internships: true },
    });
    if (!log) throw new NotFoundException('Worklog không tồn tại');

    if (log.internships.lecturer_id !== BigInt(lecturer.id)) {
      throw new BadRequestException('Bạn không có quyền review worklog này');
    }

    const updated = await this.prisma.work_logs.update({
      where: { id: BigInt(workLogId) },
      data: {
        score: dto.score ?? null,
        feedback: dto.feedback ?? null,
      },
    });

    return { message: 'Review worklog thành công', worklog: updated };
  }
}
