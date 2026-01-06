import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { CreateTermDto } from './dto/create-term.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateInternshipStatusDto } from './dto/update-internship-status.dto';

import { CreateTopicRegistrationDto } from './dto/create-topic-registration.dto';
import { ApproveRegistrationDto } from './dto/approve-registratio.dto';
import { RejectRegistrationDto } from './dto/reject-registratio.dto';

import {
  buildPaginationResponse,
  parsePaginationQuery,
} from 'src/common/helpers/pagination.helper';

@Injectable()
export class InternshipsService {
  prisma = new PrismaClient();

  // ====================== STUDENT ======================

  async getInternshipTopics(page: number, limit: number) {
    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.internship_topics.findMany({
        skip,
        take: l,
        orderBy: { created_at: 'desc' },
        include: { lecturers: true },
      }),
      this.prisma.internship_topics.count(),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  /**
   * Student tạo đăng ký đề tài (pending)
   * Body: { topic_id }
   */
  async createTopicRegistration(
    studentUserId: string,
    dto: CreateTopicRegistrationDto,
  ) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });

    if (!student) throw new BadRequestException('Sinh viên không tồn tại');

    const topic = await this.prisma.internship_topics.findUnique({
      where: { id: BigInt(dto.topic_id) },
    });

    if (!topic) throw new BadRequestException('Đề tài không tồn tại');

    // Fix TS null + BigInt
    const current = Number(topic.current_students ?? 0);
    const max = Number(topic.max_students ?? 0);

    if (topic.status !== 'available') {
      throw new BadRequestException('Đề tài đã đóng');
    }
    if (current >= max) {
      throw new BadRequestException('Đề tài đã đủ số lượng sinh viên');
    }

    const existed = await this.prisma.topic_registrations.findFirst({
      where: {
        student_id: BigInt(student.id),
        topic_id: BigInt(topic.id),
      },
    });

    if (existed) {
      throw new BadRequestException('Bạn đã đăng ký đề tài này');
    }

    const registration = await this.prisma.topic_registrations.create({
      data: {
        student_id: BigInt(student.id),
        topic_id: BigInt(topic.id),
        status: 'pending',
      },
    });

    return {
      message: 'Đăng ký đề tài thành công, vui lòng chờ giảng viên duyệt',
      registration,
    };
  }

  async getMyInternship(studentUserId: string) {
    // studentUserId là users.id => cần tìm students.id
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });

    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    return this.prisma.internships.findFirst({
      where: { student_id: BigInt(student.id) },
      include: {
        internship_terms: true,
        internship_topics: true,
        lecturers: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
  async getMyTopicRegistration(studentUserId: string) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Sinh viên không tồn tại');
    }

    // Lấy đăng ký mới nhất của sinh viên (pending / approved / rejected)
    const registration = await this.prisma.topic_registrations.findFirst({
      where: {
        student_id: BigInt(student.id),
      },
      orderBy: { registered_at: 'desc' }, // hoặc created_at nếu field tên khác
      include: {
        internship_topics: {
          include: {
            lecturers: true,
          },
        },
      },
    });

    // Có thể trả về null nếu chưa đăng ký
    return { registration };
  }

  async getMyProgress(studentUserId: string) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });

    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    const internship = await this.prisma.internships.findFirst({
      where: { student_id: BigInt(student.id) },
      include: {
        attendance_records: true,
        progress_reports: true,
        work_logs: true,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!internship)
      throw new NotFoundException('Bạn chưa đăng ký kỳ thực tập nào');

    return internship;
  }

  // ====================== LECTURER ======================

  // async getSupervisedStudents(
  //   lecturerUserId: string,
  //   page: number,
  //   limit: number,
  // ) {
  //   // lecturerUserId là users.id => tìm lecturers.id
  //   const lecturer = await this.prisma.lecturers.findFirst({
  //     where: { user_id: BigInt(lecturerUserId) },
  //     select: { id: true },
  //   });

  //   if (!lecturer) throw new BadRequestException('Giảng viên không tồn tại');

  //   const { page: p, limit: l } = parsePaginationQuery({
  //     page,
  //     limit,
  //     maxLimit: 50,
  //   });
  //   const skip = (p - 1) * l;

  //   const [items, total] = await Promise.all([
  //     this.prisma.internships.findMany({
  //       where: { lecturer_id: BigInt(lecturer.id) },
  //       skip,
  //       take: l,
  //       orderBy: { created_at: 'desc' },
  //       include: {
  //         students: { include: { users: true, classes: true } },
  //         internship_topics: true,
  //         internship_terms: true,
  //       },
  //     }),
  //     this.prisma.internships.count({
  //       where: { lecturer_id: BigInt(lecturer.id) },
  //     }),
  //   ]);

  //   return buildPaginationResponse(items, total, p, l);
  // }

  async getSupervisedStudents(
    lecturerUserId: string,
    params: {
      termId?: string;
      status?: string;
      q?: string;
      page: number;
      limit: number;
    },
  ) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });
    if (!lecturer) throw new BadRequestException('Giảng viên không tồn tại');

    const { page: p, limit: l } = parsePaginationQuery({
      page: params.page,
      limit: params.limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const q = (params.q ?? '').trim();
    const where: any = {
      lecturer_id: BigInt(lecturer.id),
    };

    if (params.termId) where.term_id = BigInt(params.termId);
    if (params.status) where.status = params.status;

    // search theo tên, mã sv, email, lớp, đề tài
    if (q) {
      where.OR = [
        { students: { student_code: { contains: q } } },
        { students: { users: { full_name: { contains: q } } } },
        { students: { users: { email: { contains: q } } } },
        { students: { classes: { class_name: { contains: q } } } },
        { internship_topics: { title: { contains: q } } },
        { internship_terms: { term_name: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.internships.findMany({
        where,
        skip,
        take: l,
        orderBy: { created_at: 'desc' },
        include: {
          students: { include: { users: true, classes: true } },
          internship_topics: true,
          internship_terms: true,
        },
      }),
      this.prisma.internships.count({ where }),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async updateStatus(
    lecturerUserId: string,
    internshipId: string,
    dto: UpdateInternshipStatusDto,
  ) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });

    if (!lecturer) throw new BadRequestException('Giảng viên không tồn tại');

    const internship = await this.prisma.internships.findUnique({
      where: { id: BigInt(internshipId) },
    });

    if (!internship) throw new NotFoundException('Không tìm thấy internship');

    if (internship.lecturer_id !== BigInt(lecturer.id)) {
      throw new BadRequestException('Bạn không hướng dẫn internship này');
    }

    const updated = await this.prisma.internships.update({
      where: { id: BigInt(internshipId) },
      data: { status: dto.status },
    });

    return { message: 'Cập nhật trạng thái thành công', internship: updated };
  }

  async getPendingRegistrations(lecturerUserId: string, topicId: string) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });

    if (!lecturer) throw new BadRequestException('Giảng viên không tồn tại');

    const topic = await this.prisma.internship_topics.findUnique({
      where: { id: BigInt(topicId) },
    });

    if (!topic) throw new BadRequestException('Đề tài không tồn tại');

    if (topic.created_by_lecturer_id !== BigInt(lecturer.id)) {
      throw new BadRequestException('Bạn không quản lý đề tài này');
    }

    const regs = await this.prisma.topic_registrations.findMany({
      where: { topic_id: BigInt(topicId), status: 'pending' },
      orderBy: { registered_at: 'asc' },
      include: {
        students: {
          include: {
            users: true,
            classes: true,
          },
        },
      },
    });

    return { items: regs };
  }

  async approveTopicRegistration(
    lecturerUserId: string,
    registrationId: string,
    dto: ApproveRegistrationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const lecturer = await tx.lecturers.findFirst({
        where: { user_id: BigInt(lecturerUserId) },
        select: { id: true },
      });
      if (!lecturer) throw new BadRequestException('Giảng viên không tồn tại');

      const registration = await tx.topic_registrations.findUnique({
        where: { id: BigInt(registrationId) },
      });
      if (!registration) throw new BadRequestException('Đăng ký không tồn tại');
      if (registration.status !== 'pending') {
        throw new BadRequestException(
          'Đăng ký này không còn ở trạng thái chờ duyệt',
        );
      }

      const topic = await tx.internship_topics.findUnique({
        where: { id: registration.topic_id },
      });
      if (!topic) throw new BadRequestException('Đề tài không tồn tại');

      if (topic.created_by_lecturer_id !== BigInt(lecturer.id)) {
        throw new BadRequestException('Bạn không quản lý đề tài này');
      }

      const termId = topic.term_id;
      if (!termId)
        throw new BadRequestException('Đề tài chưa được gán kỳ thực tập');

      const current = Number(topic.current_students ?? 0);
      const max = Number(topic.max_students ?? 0);

      if (topic.status !== 'available')
        throw new BadRequestException('Đề tài đã đóng');
      if (current >= max)
        throw new BadRequestException('Đề tài đã đủ số lượng sinh viên');

      const existedInternship = await tx.internships.findFirst({
        where: { student_id: registration.student_id, term_id: termId },
      });
      if (existedInternship) {
        throw new BadRequestException(
          'Sinh viên đã có internship trong kỳ này',
        );
      }

      const updatedRegistration = await tx.topic_registrations.update({
        where: { id: registration.id },
        data: { status: 'approved' },
      });

      const internship = await tx.internships.create({
        data: {
          student_id: registration.student_id,
          lecturer_id: BigInt(lecturer.id),
          term_id: termId,
          topic_id: topic.id,
          status: 'registered',
        },
      });

      const updatedCount = current + 1;
      await tx.internship_topics.update({
        where: { id: topic.id },
        data: {
          current_students: updatedCount,
          status: updatedCount >= max ? 'full' : 'available',
        },
      });

      return {
        message: 'Duyệt đăng ký thành công',
        note: dto?.note,
        registration: updatedRegistration,
        internship,
      };
    });
  }

  async rejectTopicRegistration(
    lecturerUserId: string,
    registrationId: string,
    dto: RejectRegistrationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const lecturer = await tx.lecturers.findFirst({
        where: { user_id: BigInt(lecturerUserId) },
        select: { id: true },
      });
      if (!lecturer) throw new BadRequestException('Giảng viên không tồn tại');

      const registration = await tx.topic_registrations.findUnique({
        where: { id: BigInt(registrationId) },
      });
      if (!registration) throw new BadRequestException('Đăng ký không tồn tại');
      if (registration.status !== 'pending') {
        throw new BadRequestException(
          'Đăng ký này không còn ở trạng thái chờ duyệt',
        );
      }

      const topic = await tx.internship_topics.findUnique({
        where: { id: registration.topic_id },
      });
      if (!topic) throw new BadRequestException('Đề tài không tồn tại');

      if (topic.created_by_lecturer_id !== BigInt(lecturer.id)) {
        throw new BadRequestException('Bạn không quản lý đề tài này');
      }

      // ✅ update -> rejected
      const updatedRegistration = await tx.topic_registrations.update({
        where: { id: registration.id },
        data: { status: 'rejected' },
      });

      return {
        message: 'Từ chối đăng ký thành công',
        reason: dto.reason,
        registration: updatedRegistration,
      };
    });
  }

  // ====================== ADMIN ======================

  async createTerm(dto: CreateTermDto) {
    const term = await this.prisma.internship_terms.create({
      data: {
        term_name: dto.term_name,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
      },
    });

    return { message: 'Tạo kỳ thực tập thành công', term };
  }

  async getAllInternships(page: number, limit: number) {
    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.internships.findMany({
        skip,
        take: l,
        orderBy: { created_at: 'desc' },
        include: {
          students: { include: { users: true, classes: true } },
          lecturers: { include: { users: true } },
          internship_terms: true,
          internship_topics: true,
        },
      }),
      this.prisma.internships.count(),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async getAllInternshipTerms(page: number, limit: number) {
    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    // Lấy danh sách kỳ
    const [terms, total] = await Promise.all([
      this.prisma.internship_terms.findMany({
        skip,
        take: l,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.internship_terms.count(),
    ]);

    if (!terms.length) {
      return buildPaginationResponse([], total, p, l);
    }

    // Lấy toàn bộ internship thuộc các kỳ này
    const termIds = terms.map((t) => t.id);

    const internships = await this.prisma.internships.findMany({
      where: {
        term_id: { in: termIds },
      },
      select: {
        term_id: true,
        student_id: true,
        lecturer_id: true,
        topic_id: true,
      },
    });

    // Gom thống kê theo term_id
    const statsMap: Record<
      string,
      {
        students: Set<string>;
        lecturers: Set<string>;
        topics: Set<string>;
      }
    > = {};

    for (const i of internships) {
      const key = i.term_id.toString();
      if (!statsMap[key]) {
        statsMap[key] = {
          students: new Set<string>(),
          lecturers: new Set<string>(),
          topics: new Set<string>(),
        };
      }

      if (i.student_id) statsMap[key].students.add(i.student_id.toString());
      if (i.lecturer_id) statsMap[key].lecturers.add(i.lecturer_id.toString());
      if (i.topic_id) statsMap[key].topics.add(i.topic_id.toString());
    }

    // Gắn số liệu vào từng term
    const dataWithStats = terms.map((t) => {
      const key = t.id.toString();
      const stat = statsMap[key] || {
        students: new Set<string>(),
        lecturers: new Set<string>(),
        topics: new Set<string>(),
      };

      return {
        ...t,
        students_count: stat.students.size,
        lecturers_count: stat.lecturers.size,
        topics_count: stat.topics.size,
      };
    });

    return buildPaginationResponse(dataWithStats, total, p, l);
  }

  async getTopicsByTerm(termId: string, page: number, limit: number) {
    const term = await this.prisma.internship_terms.findUnique({
      where: { id: BigInt(termId) },
      select: { id: true },
    });
    if (!term) throw new BadRequestException('Kỳ thực tập không tồn tại');

    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.internship_topics.findMany({
        where: { term_id: BigInt(termId) },
        skip,
        take: l,
        orderBy: { created_at: 'desc' },
        include: { lecturers: true },
      }),
      this.prisma.internship_topics.count({
        where: { term_id: BigInt(termId) },
      }),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async getMyTopicsByTerm(
    lecturerUserId: string,
    termId: string,
    page: number,
    limit: number,
  ) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });
    if (!lecturer) throw new BadRequestException('Giảng viên không tồn tại');

    const term = await this.prisma.internship_terms.findUnique({
      where: { id: BigInt(termId) },
      select: { id: true },
    });
    if (!term) throw new BadRequestException('Kỳ thực tập không tồn tại');

    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.internship_topics.findMany({
        where: {
          term_id: BigInt(termId),
          created_by_lecturer_id: BigInt(lecturer.id),
        },
        skip,
        take: l,
        orderBy: { created_at: 'desc' },
        include: { lecturers: true },
      }),
      this.prisma.internship_topics.count({
        where: {
          term_id: BigInt(termId),
          created_by_lecturer_id: BigInt(lecturer.id),
        },
      }),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async createTopic(lecturerUserId: string, dto: CreateTopicDto) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });
    if (!lecturer) throw new BadRequestException('Giảng viên không tồn tại');

    const term = await this.prisma.internship_terms.findUnique({
      where: { id: BigInt(dto.term_id) },
      select: { id: true },
    });
    if (!term) throw new BadRequestException('Kỳ thực tập không tồn tại');

    const maxStudents = dto.max_students ?? 3;

    const topic = await this.prisma.internship_topics.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        company_name: dto.company_name ?? null,
        company_address: dto.company_address ?? null,
        created_by_lecturer_id: BigInt(lecturer.id),
        term_id: BigInt(dto.term_id),
        max_students: maxStudents,
        current_students: 0,
        status: 'available',
      },
    });

    return { message: 'Tạo đề tài thành công', topic };
  }
}
