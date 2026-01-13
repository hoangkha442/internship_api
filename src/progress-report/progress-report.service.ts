// import {
//   BadRequestException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { PrismaClient, progress_reports_status } from '@prisma/client';
// import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
// import {
//   parsePaginationQuery,
//   buildPaginationResponse,
// } from 'src/common/helpers/pagination.helper';

// import { CreateReportDto } from './dto/create-report.dto';
// import { UpdateReportDto } from './dto/update-report.dto';
// import { ReviewReportDto } from './dto/review-report.dto';

// function baseNameNoExt(original: string) {
//   return (original || 'file').replace(/\.[^/.]+$/, '');
// }
// function slugify(s: string) {
//   return s
//     .normalize('NFD')
//     .replace(/[\u0300-\u036f]/g, '')
//     .replace(/[^\w\-]+/g, '-')
//     .replace(/-+/g, '-')
//     .replace(/^-|-$/g, '')
//     .toLowerCase();
// }

// @Injectable()
// export class ProgressReportService {
//   prisma = new PrismaClient();

//   constructor(private readonly cloudinary: CloudinaryService) {}

//   // -------------------------
//   // STUDENT
//   // -------------------------
//   async getStudentReports(
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
//         'Bạn không có quyền xem báo cáo của internship này',
//       );
//     }

//     const { page: p, limit: l } = parsePaginationQuery({
//       page,
//       limit,
//       maxLimit: 50,
//     });
//     const skip = (p - 1) * l;

//     const [items, total] = await Promise.all([
//       this.prisma.progress_reports.findMany({
//         where: { internship_id: BigInt(internshipId) },
//         skip,
//         take: l,
//         orderBy: [{ submitted_at: 'desc' }, { id: 'desc' }],
//         include: { report_attachments: true },
//       }),
//       this.prisma.progress_reports.count({
//         where: { internship_id: BigInt(internshipId) },
//       }),
//     ]);

//     return buildPaginationResponse(items, total, p, l);
//   }

//   // async createStudentReport(
//   //   studentUserId: string,
//   //   dto: CreateReportDto,
//   //   files: Express.Multer.File[] = [],
//   // ) {
//   //   const student = await this.prisma.students.findFirst({
//   //     where: { user_id: BigInt(studentUserId) },
//   //     select: { id: true },
//   //   });
//   //   if (!student) throw new NotFoundException('Sinh viên không tồn tại');

//   //   const internship = await this.prisma.internships.findUnique({
//   //     where: { id: BigInt(dto.internship_id) },
//   //     select: { id: true, student_id: true },
//   //   });
//   //   if (!internship) throw new NotFoundException('Không tìm thấy internship');
//   //   if (internship.student_id !== BigInt(student.id)) {
//   //     throw new BadRequestException('Bạn không có quyền nộp báo cáo cho internship này');
//   //   }

//   //   // Optional: chặn trùng report_no/week_no (nếu bạn đã add UNIQUE thì càng chắc)
//   //   if (dto.report_no != null) {
//   //     const existed = await this.prisma.progress_reports.findFirst({
//   //       where: {
//   //         internship_id: BigInt(dto.internship_id),
//   //         report_no: dto.report_no,
//   //       },
//   //       select: { id: true },
//   //     });
//   //     if (existed) throw new BadRequestException('Report_no đã tồn tại cho internship này');
//   //   }
//   //   if (dto.week_no != null) {
//   //     const existed = await this.prisma.progress_reports.findFirst({
//   //       where: {
//   //         internship_id: BigInt(dto.internship_id),
//   //         week_no: dto.week_no,
//   //       },
//   //       select: { id: true },
//   //     });
//   //     if (existed) throw new BadRequestException('Week_no đã tồn tại cho internship này');
//   //   }

//   //   return this.prisma.$transaction(async (tx) => {
//   //     const report = await tx.progress_reports.create({
//   //       data: {
//   //         internship_id: BigInt(dto.internship_id),
//   //         report_no: dto.report_no ?? null,
//   //         week_no: dto.week_no ?? null,
//   //         title: dto.title,
//   //         content: dto.content,
//   //         status: progress_reports_status.submitted,
//   //         submitted_at: new Date(),
//   //         is_pass: true,
//   //       },
//   //     });

//   //     if (files.length) {
//   //       const folder = `reports/${dto.internship_id}`;

//   //       const uploaded = await Promise.all(
//   //         files.map((f) =>
//   //           this.cloudinary.uploadPublicFile(f, {
//   //             folder,
//   //             // ✅ public_id chỉ là tên file, KHÔNG kèm folder để tránh lặp
//   //             public_id: `${Date.now()}-${slugify(baseNameNoExt(f.originalname))}`,
//   //           }),
//   //         ),
//   //       );

//   //       await tx.report_attachments.createMany({
//   //         data: uploaded.map((u, idx) => ({
//   //           report_id: report.id,
//   //           file_path: u.secure_url,
//   //           public_id: u.public_id,
//   //           description: files[idx]?.originalname ?? null,
//   //         })),
//   //       });
//   //     }

//   //     const full = await tx.progress_reports.findUnique({
//   //       where: { id: report.id },
//   //       include: { report_attachments: true },
//   //     });

//   //     return { message: 'Nộp báo cáo tiến độ thành công', report: full };
//   //   });
//   // }
//   async createStudentReport(
//     studentUserId: string,
//     dto: CreateReportDto,
//     files: Express.Multer.File[] = [],
//   ) {
//     // 1) validate student + internship như bạn đang làm...

//     // 2) Upload ngoài transaction (có thể tốn thời gian)
//     const uploaded = files.length
//       ? await Promise.all(
//           files.map((f) =>
//             this.cloudinary.uploadPublicFile(f, {
//               folder: `reports/${dto.internship_id}`,
//               public_id: `reports/${dto.internship_id}/${Date.now()}-${(
//                 f.originalname || 'file'
//               )
//                 .replace(/\.[^/.]+$/, '')
//                 .replace(/[^\w\-]+/g, '-')}`,
//             }),
//           ),
//         )
//       : [];

//     try {
//       // 3) Transaction chỉ làm DB (nhanh)
//       const result = await this.prisma.$transaction(
//         async (tx) => {
//           const report = await tx.progress_reports.create({
//             data: {
//               internship_id: BigInt(dto.internship_id),
//               report_no: dto.report_no ?? null,
//               week_no: dto.week_no ?? null,
//               title: dto.title,
//               content: dto.content, // HTML từ rich editor cũng ok
//             },
//           });

//           if (uploaded.length) {
//             await tx.report_attachments.createMany({
//               data: uploaded.map((u) => ({
//                 report_id: report.id,
//                 file_path: u.secure_url,
//                 description: null,
//               })),
//             });
//           }

//           const full = await tx.progress_reports.findUnique({
//             where: { id: report.id },
//             include: { report_attachments: true },
//           });

//           return full;
//         },
//         // (tuỳ chọn) vẫn có thể set timeout cao hơn nếu muốn
//         { timeout: 20_000 },
//       );

//       return { message: 'Nộp báo cáo thành công', report: result };
//     } catch (e) {
//       // 4) Nếu DB fail thì xoá file đã upload để khỏi rác Cloudinary
//       await Promise.all(
//         uploaded
//           .filter((u) => u.public_id)
//           .map((u) =>
//             this.cloudinary.deleteByPublicId(u.public_id).catch(() => null),
//           ),
//       );
//       throw e;
//     }
//   }

//   async updateStudentReport(
//     studentUserId: string,
//     reportId: string,
//     dto: UpdateReportDto,
//     files: Express.Multer.File[] = [],
//   ) {
//     const student = await this.prisma.students.findFirst({
//       where: { user_id: BigInt(studentUserId) },
//       select: { id: true },
//     });
//     if (!student) throw new NotFoundException('Sinh viên không tồn tại');

//     const report = await this.prisma.progress_reports.findUnique({
//       where: { id: BigInt(reportId) },
//       include: { internships: true, report_attachments: true },
//     });
//     if (!report) throw new NotFoundException('Báo cáo không tồn tại');

//     if (report.internships.student_id !== BigInt(student.id)) {
//       throw new BadRequestException('Bạn không có quyền sửa báo cáo này');
//     }

//     // Rule: reviewed => không cho sửa
//     if (report.status === progress_reports_status.reviewed) {
//       throw new BadRequestException(
//         'Báo cáo đã được duyệt, không thể chỉnh sửa',
//       );
//     }

//     // check trùng nếu đổi report_no/week_no
//     if (dto.report_no != null) {
//       const existed = await this.prisma.progress_reports.findFirst({
//         where: {
//           internship_id: report.internship_id,
//           report_no: dto.report_no,
//           NOT: { id: BigInt(reportId) },
//         },
//         select: { id: true },
//       });
//       if (existed)
//         throw new BadRequestException(
//           'Report_no đã tồn tại cho internship này',
//         );
//     }
//     if (dto.week_no != null) {
//       const existed = await this.prisma.progress_reports.findFirst({
//         where: {
//           internship_id: report.internship_id,
//           week_no: dto.week_no,
//           NOT: { id: BigInt(reportId) },
//         },
//         select: { id: true },
//       });
//       if (existed)
//         throw new BadRequestException('Week_no đã tồn tại cho internship này');
//     }

//     return this.prisma.$transaction(async (tx) => {
//       const updated = await tx.progress_reports.update({
//         where: { id: BigInt(reportId) },
//         data: {
//           report_no: dto.report_no ?? undefined,
//           week_no: dto.week_no ?? undefined,
//           title: dto.title ?? undefined,
//           content: dto.content ?? undefined,

//           // nếu đang needs_revision và SV sửa => nộp lại
//           status:
//             report.status === progress_reports_status.needs_revision
//               ? progress_reports_status.submitted
//               : undefined,
//           submitted_at:
//             report.status === progress_reports_status.needs_revision
//               ? new Date()
//               : undefined,
//         },
//       });

//       // append attachments (giống worklog)
//       if (files.length) {
//         const internshipIdStr = report.internship_id.toString();
//         const folder = `reports/${internshipIdStr}`;

//         const uploaded = await Promise.all(
//           files.map((f) =>
//             this.cloudinary.uploadPublicFile(f, {
//               folder,
//               public_id: `${Date.now()}-${slugify(baseNameNoExt(f.originalname))}`,
//             }),
//           ),
//         );

//         await tx.report_attachments.createMany({
//           data: uploaded.map((u, idx) => ({
//             report_id: updated.id,
//             file_path: u.secure_url,
//             public_id: u.public_id,
//             description: files[idx]?.originalname ?? null,
//           })),
//         });
//       }

//       const full = await tx.progress_reports.findUnique({
//         where: { id: updated.id },
//         include: { report_attachments: true },
//       });

//       return { message: 'Cập nhật báo cáo thành công', report: full };
//     });
//   }

//   async deleteStudentReport(studentUserId: string, reportId: string) {
//     const student = await this.prisma.students.findFirst({
//       where: { user_id: BigInt(studentUserId) },
//       select: { id: true },
//     });
//     if (!student) throw new NotFoundException('Sinh viên không tồn tại');

//     const report = await this.prisma.progress_reports.findUnique({
//       where: { id: BigInt(reportId) },
//       include: { internships: true, report_attachments: true },
//     });
//     if (!report) throw new NotFoundException('Báo cáo không tồn tại');

//     if (report.internships.student_id !== BigInt(student.id)) {
//       throw new BadRequestException('Bạn không có quyền xoá báo cáo này');
//     }

//     if (report.status === progress_reports_status.reviewed) {
//       throw new BadRequestException('Báo cáo đã được duyệt, không thể xoá');
//     }

//     // xoá cloudinary trước
//     await Promise.all(
//       (report.report_attachments ?? [])
//         .filter((a) => a.public_id)
//         .map((a) => this.cloudinary.deleteByPublicId(a.public_id!)),
//     );

//     await this.prisma.progress_reports.delete({
//       where: { id: BigInt(reportId) },
//     });
//     return { message: 'Xoá báo cáo thành công' };
//   }

//   // -------------------------
//   // LECTURER
//   // -------------------------
//   async getLecturerReports(
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
//       this.prisma.progress_reports.findMany({
//         where: { internship_id: BigInt(internshipId) },
//         skip,
//         take: l,
//         orderBy: [{ submitted_at: 'desc' }, { id: 'desc' }],
//         include: {
//           report_attachments: true,
//           internships: {
//             include: {
//               students: {
//                 include: {
//                   users: { select: { full_name: true, email: true } },
//                 },
//               },
//             },
//           },
//         },
//       }),
//       this.prisma.progress_reports.count({
//         where: { internship_id: BigInt(internshipId) },
//       }),
//     ]);

//     return buildPaginationResponse(items, total, p, l);
//   }

//   async reviewReport(
//     lecturerUserId: string,
//     reportId: string,
//     dto: ReviewReportDto,
//   ) {
//     const lecturer = await this.prisma.lecturers.findFirst({
//       where: { user_id: BigInt(lecturerUserId) },
//       select: { id: true },
//     });
//     if (!lecturer) throw new NotFoundException('Giảng viên không tồn tại');

//     const report = await this.prisma.progress_reports.findUnique({
//       where: { id: BigInt(reportId) },
//       include: { internships: true },
//     });
//     if (!report) throw new NotFoundException('Báo cáo không tồn tại');

//     if (report.internships.lecturer_id !== BigInt(lecturer.id)) {
//       throw new BadRequestException('Bạn không có quyền review báo cáo này');
//     }

//     const updated = await this.prisma.progress_reports.update({
//       where: { id: BigInt(reportId) },
//       data: {
//         status: dto.status ?? undefined,
//         score: dto.score ?? null,
//         feedback: dto.feedback ?? null,
//         is_pass: dto.is_pass ?? undefined,
//         reviewed_by_lecturer_id: BigInt(lecturer.id),
//         reviewed_at: new Date(),
//       },
//     });

//     return { message: 'Review báo cáo thành công', report: updated };
//   }

//   // -------------------------
//   // ADMIN (read-only list)
//   // -------------------------
//   async getAdminReports(params: {
//     status?: string;
//     termId?: string;
//     lecturerId?: string;
//     studentId?: string;
//     internshipId?: string;
//     page?: number;
//     limit?: number;
//   }) {
//     const { status, termId, lecturerId, studentId, internshipId, page, limit } =
//       params;

//     if (
//       status &&
//       !Object.values(progress_reports_status).includes(status as any)
//     ) {
//       throw new BadRequestException('Status không hợp lệ');
//     }

//     const { page: p, limit: l } = parsePaginationQuery({
//       page: page as any,
//       limit: limit as any,
//       maxLimit: 100,
//     });
//     const skip = (p - 1) * l;

//     const where: any = {};
//     if (status) where.status = status;
//     if (internshipId) where.internship_id = BigInt(internshipId);

//     if (termId || lecturerId || studentId) {
//       where.internships = {};
//       if (termId) where.internships.term_id = BigInt(termId);
//       if (lecturerId) where.internships.lecturer_id = BigInt(lecturerId);
//       if (studentId) where.internships.student_id = BigInt(studentId);
//     }

//     const [items, total] = await Promise.all([
//       this.prisma.progress_reports.findMany({
//         where,
//         skip,
//         take: l,
//         orderBy: [{ submitted_at: 'desc' }, { id: 'desc' }],
//         include: {
//           report_attachments: true,
//           internships: {
//             include: {
//               internship_terms: { select: { id: true, term_name: true } },
//               students: {
//                 include: {
//                   users: { select: { full_name: true, email: true } },
//                 },
//               },
//               lecturers: {
//                 include: {
//                   users: { select: { full_name: true, email: true } },
//                 },
//               },
//             },
//           },
//         },
//       }),
//       this.prisma.progress_reports.count({ where }),
//     ]);

//     return buildPaginationResponse(items, total, p, l);
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
import { CreateProgressReportDto } from 'src/progress-report/dto/create-report.dto';
import { ReviewProgressReportDto } from 'src/progress-report/dto/review-report.dto';
import { UpdateProgressReportDto } from 'src/progress-report/dto/update-report.dto';

@Injectable()
export class ProgressReportService {
  prisma = new PrismaClient();

  constructor(private readonly cloudinary: CloudinaryService) {}

  async getStudentReports(
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
        'Bạn không có quyền xem báo cáo của internship này',
      );
    }

    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.progress_reports.findMany({
        where: { internship_id: BigInt(internshipId) },
        skip,
        take: l,
        orderBy: [{ submitted_at: 'desc' }, { id: 'desc' }],
        include: { report_attachments: true },
      }),
      this.prisma.progress_reports.count({
        where: { internship_id: BigInt(internshipId) },
      }),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async createStudentReport(
    studentUserId: string,
    dto: CreateProgressReportDto,
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
        'Bạn không có quyền nộp báo cáo cho internship này',
      );
    }

    const uploaded = files.length
      ? await Promise.all(
          files.map((f) =>
            this.cloudinary.uploadPublicFile(f, {
              folder: `reports/${dto.internship_id}`,
              public_id: `reports/${dto.internship_id}/${Date.now()}-${(
                f.originalname || 'file'
              )
                .replace(/\.[^/.]+$/, '')
                .replace(/[^\w\-]+/g, '-')}`,
            }),
          ),
        )
      : [];

    try {
      const full = await this.prisma.$transaction(async (tx) => {
        const report = await tx.progress_reports.create({
          data: {
            internship_id: BigInt(dto.internship_id),
            report_no: Number(dto.report_no)  ?? null,
            week_no: Number(dto.week_no) ?? null,
            title: dto.title,
            content: dto.content, // HTML
          },
        });

        if (uploaded.length) {
          await tx.report_attachments.createMany({
            data: uploaded.map((u) => ({
              report_id: report.id,
              file_path: u.secure_url,
              public_id: u.public_id ?? null,
              description: null,
            })),
          });
        }

        return tx.progress_reports.findUnique({
          where: { id: report.id },
          include: { report_attachments: true },
        });
      });

      return { message: 'Nộp báo cáo thành công', report: full };
    } catch (e) {
      // DB fail -> xoá file đã upload để tránh rác
      await Promise.all(
        uploaded
          .filter((u) => u.public_id)
          .map((u) =>
            this.cloudinary.deleteByPublicId(u.public_id).catch(() => null),
          ),
      );
      throw e;
    }
  }

  // async updateStudentReport(
  //   studentUserId: string,
  //   reportId: string,
  //   dto: UpdateProgressReportDto,
  //   files: Express.Multer.File[] = [],
  // ) {
  //   const student = await this.prisma.students.findFirst({
  //     where: { user_id: BigInt(studentUserId) },
  //     select: { id: true },
  //   });
  //   if (!student) throw new NotFoundException('Sinh viên không tồn tại');

  //   const report = await this.prisma.progress_reports.findUnique({
  //     where: { id: BigInt(reportId) },
  //     include: { internships: true, report_attachments: true },
  //   });
  //   if (!report) throw new NotFoundException('Báo cáo không tồn tại');

  //   if (report.internships.student_id !== BigInt(student.id)) {
  //     throw new BadRequestException('Bạn không có quyền sửa báo cáo này');
  //   }

  //   // Nếu đã được review thì không cho sửa (tuỳ bạn)
  //   if (report.status === 'reviewed') {
  //     throw new BadRequestException(
  //       'Báo cáo đã được duyệt, không thể chỉnh sửa',
  //     );
  //   }

  //   const replace = dto._replace_attachments === '1';

  //   // Upload file mới (nếu có) - ngoài transaction
  //   const uploaded = files.length
  //     ? await Promise.all(
  //         files.map((f) =>
  //           this.cloudinary.uploadPublicFile(f, {
  //             folder: `reports/${report.internship_id.toString()}`,
  //             public_id: `reports/${report.internship_id.toString()}/${Date.now()}-${(
  //               f.originalname || 'file'
  //             )
  //               .replace(/\.[^/.]+$/, '')
  //               .replace(/[^\w\-]+/g, '-')}`,
  //           }),
  //         ),
  //       )
  //     : [];

  //   try {
  //     const full = await this.prisma.$transaction(async (tx) => {
  //       // nếu replace file => xoá record + xoá cloudinary (xoá cloudinary làm ngoài tx cho nhanh)
  //       if (replace) {
  //         await tx.report_attachments.deleteMany({
  //           where: { report_id: report.id },
  //         });
  //       }

  //       const updated = await tx.progress_reports.update({
  //         where: { id: report.id },
  //         data: {
  //           report_no:
  //             dto.report_no != null ? Number(dto.report_no) : undefined,
  //           week_no: dto.week_no != null ? Number(dto.week_no) : undefined,
  //           title: dto.title ?? undefined,
  //           content: dto.content ?? undefined,
  //         },
  //       });

  //       if (uploaded.length) {
  //         await tx.report_attachments.createMany({
  //           data: uploaded.map((u) => ({
  //             report_id: updated.id,
  //             file_path: u.secure_url,
  //             public_id: u.public_id ?? null,
  //             description: null,
  //           })),
  //         });
  //       }

  //       return tx.progress_reports.findUnique({
  //         where: { id: updated.id },
  //         include: { report_attachments: true },
  //       });
  //     });

  //     // sau khi DB xong, nếu replace thì xoá cloudinary file cũ
  //     if (replace) {
  //       await Promise.all(
  //         (report.report_attachments ?? [])
  //           .filter((a) => a.public_id)
  //           .map((a) =>
  //             this.cloudinary.deleteByPublicId(a.public_id!).catch(() => null),
  //           ),
  //       );
  //     }

  //     return { message: 'Cập nhật báo cáo thành công', report: full };
  //   } catch (e) {
  //     // nếu DB fail -> xoá file mới upload
  //     await Promise.all(
  //       uploaded
  //         .filter((u) => u.public_id)
  //         .map((u) =>
  //           this.cloudinary.deleteByPublicId(u.public_id).catch(() => null),
  //         ),
  //     );
  //     throw e;
  //   }
  // }
async updateStudentReport(
  studentUserId: string,
  reportId: string,
  dto: UpdateProgressReportDto,
  files: Express.Multer.File[] = [],
) {
  // ===== 1) Auth & ownership =====
  const student = await this.prisma.students.findFirst({
    where: { user_id: BigInt(studentUserId) },
    select: { id: true },
  });
  if (!student) throw new NotFoundException('Sinh viên không tồn tại');

  const report = await this.prisma.progress_reports.findUnique({
    where: { id: BigInt(reportId) },
    include: { internships: true, report_attachments: true },
  });
  if (!report) throw new NotFoundException('Báo cáo không tồn tại');

  if (report.internships.student_id !== BigInt(student.id)) {
    throw new BadRequestException('Bạn không có quyền sửa báo cáo này');
  }

  // Nếu đã reviewed thì không cho sửa (tuỳ bạn)
  if (report.status === 'reviewed') {
    throw new BadRequestException('Báo cáo đã được duyệt, không thể chỉnh sửa');
  }

  // ===== 2) Decide replace behavior safely =====
  // Chỉ replace khi:
  // - client gửi _replace_attachments = '1'
  // - và có file mới thật sự
  const hasNewFiles = Array.isArray(files) && files.length > 0;
  const wantReplace = dto._replace_attachments === '1';
  const doReplace = wantReplace && hasNewFiles;

  // ===== 3) Upload new files OUTSIDE transaction =====
  const uploaded = hasNewFiles
    ? await Promise.all(
        files.map((f) =>
          this.cloudinary.uploadPublicFile(f, {
            folder: `reports/${report.internship_id.toString()}`,
            public_id: `reports/${report.internship_id.toString()}/${Date.now()}-${(
              f.originalname || 'file'
            )
              .replace(/\.[^/.]+$/, '')
              .replace(/[^\w\-]+/g, '-')}`,
          }),
        ),
      )
    : [];

  try {
    // ===== 4) DB transaction =====
    const full = await this.prisma.$transaction(async (tx) => {
      // 4.1) Update only provided fields (field nào gửi thì update field đó)
      const updated = await tx.progress_reports.update({
        where: { id: report.id },
        data: {
          report_no: dto.report_no != null ? Number(dto.report_no) : undefined,
          week_no: dto.week_no != null ? Number(dto.week_no) : undefined,
          title: dto.title ?? undefined,
          content: dto.content ?? undefined,
        },
      });

      // 4.2) Attachments: KHÔNG ĐỤNG nếu không có file mới
      if (!hasNewFiles) {
        return tx.progress_reports.findUnique({
          where: { id: updated.id },
          include: { report_attachments: true },
        });
      }

      // 4.3) Nếu replace thật sự (có file mới + flag replace) -> xoá record cũ trong DB
      if (doReplace) {
        await tx.report_attachments.deleteMany({
          where: { report_id: updated.id },
        });
      }

      // 4.4) Insert attachments mới (append hoặc replace đều insert)
      if (uploaded.length) {
        await tx.report_attachments.createMany({
          data: uploaded.map((u) => ({
            report_id: updated.id,
            file_path: u.secure_url,
            public_id: u.public_id ?? null,
            description: null,
          })),
        });
      }

      return tx.progress_reports.findUnique({
        where: { id: updated.id },
        include: { report_attachments: true },
      });
    });

    // ===== 5) After DB success: delete old cloudinary files only if doReplace =====
    if (doReplace) {
      await Promise.all(
        (report.report_attachments ?? [])
          .filter((a) => a.public_id)
          .map((a) =>
            this.cloudinary.deleteByPublicId(a.public_id!).catch(() => null),
          ),
      );
    }

    return { message: 'Cập nhật báo cáo thành công', report: full };
  } catch (e) {
    // ===== 6) If DB fails: rollback newly uploaded files =====
    await Promise.all(
      uploaded
        .filter((u) => u.public_id)
        .map((u) =>
          this.cloudinary.deleteByPublicId(u.public_id).catch(() => null),
        ),
    );
    throw e;
  }
}

  async deleteStudentReport(studentUserId: string, reportId: string) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    const report = await this.prisma.progress_reports.findUnique({
      where: { id: BigInt(reportId) },
      include: { internships: true, report_attachments: true },
    });
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');

    if (report.internships.student_id !== BigInt(student.id)) {
      throw new BadRequestException('Bạn không có quyền xoá báo cáo này');
    }

    // xoá cloudinary trước
    await Promise.all(
      (report.report_attachments ?? [])
        .filter((a) => a.public_id)
        .map((a) =>
          this.cloudinary.deleteByPublicId(a.public_id!).catch(() => null),
        ),
    );

    await this.prisma.progress_reports.delete({ where: { id: report.id } });
    return { message: 'Xoá báo cáo thành công' };
  }

  async getLecturerReports(
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
      this.prisma.progress_reports.findMany({
        where: { internship_id: BigInt(internshipId) },
        skip,
        take: l,
        orderBy: [{ submitted_at: 'desc' }, { id: 'desc' }],
        include: { report_attachments: true },
      }),
      this.prisma.progress_reports.count({
        where: { internship_id: BigInt(internshipId) },
      }),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async reviewReport(
    lecturerUserId: string,
    reportId: string,
    dto: ReviewProgressReportDto,
  ) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });
    if (!lecturer) throw new NotFoundException('Giảng viên không tồn tại');

    const report = await this.prisma.progress_reports.findUnique({
      where: { id: BigInt(reportId) },
      include: { internships: true },
    });
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');

    if (report.internships.lecturer_id !== BigInt(lecturer.id)) {
      throw new BadRequestException('Bạn không có quyền review báo cáo này');
    }

    // logic chặt: nếu status=reviewed mà không gửi is_pass thì giữ null cũng được
    const updated = await this.prisma.progress_reports.update({
      where: { id: BigInt(reportId) },
      data: {
        status: dto.status ?? report.status,
        score: dto.score ?? null,
        feedback: dto.feedback ?? null,
        is_pass: dto.is_pass ?? null, // ✅ chỉ lecturer set
        reviewed_at: new Date(),
        reviewed_by_lecturer_id: BigInt(lecturer.id),
      },
    });

    return { message: 'Review báo cáo thành công', report: updated };
  }
}
