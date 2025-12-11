import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RegisterInternshipDto } from './dto/register-internship.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateInternshipStatusDto } from 'src/internships/dto/update-internship-status.dto';
import {
  buildPaginationResponse,
  parsePaginationQuery,
} from 'src/common/helpers/pagination.helper';

@Injectable()
export class InternshipsService {
  prisma = new PrismaClient();

  // ====================== STUDENT ======================

  async registerInternship(studentId: string, dto: RegisterInternshipDto) {
    const topic = await this.prisma.internship_topics.findUnique({
      where: { id: BigInt(dto.topic_id) },
    });

    if (!topic) throw new BadRequestException('Đề tài không tồn tại');

    if (topic.created_by_lecturer_id !== BigInt(dto.lecturer_id)) {
      throw new BadRequestException('Đề tài không thuộc giảng viên này');
    }
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentId) },
      select: { id: true },
    });

    if (!student) {
      throw new BadRequestException('Sinh viên không tồn tại');
    }

    const existing = await this.prisma.internships.findFirst({
      where: {
        student_id: BigInt(student.id),
        term_id: BigInt(dto.term_id),
      },
    });

    if (existing)
      throw new BadRequestException('Bạn đã đăng ký kỳ thực tập này');

    const internship = await this.prisma.internships.create({
      data: {
        student_id: BigInt(student.id),
        lecturer_id: BigInt(dto.lecturer_id),
        term_id: BigInt(dto.term_id),
        topic_id: BigInt(dto.topic_id),
        status: 'registered',
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
      },
    });

    return {
      message: 'Đăng ký thực tập thành công',
      internship,
    };
  }

  async getMyInternship(studentId: string) {
    return this.prisma.internships.findFirst({
      where: { student_id: BigInt(studentId) },
      include: {
        internship_terms: true,
        internship_topics: true,
        lecturers: true,
      },
    });
  }

  async getMyProgress(studentId: string) {
    const internship = await this.prisma.internships.findFirst({
      where: { student_id: BigInt(studentId) },
      include: {
        attendance_records: true,
        progress_reports: true,
        work_logs: true,
      },
    });

    if (!internship)
      throw new NotFoundException('Bạn chưa đăng ký kỳ thực tập nào');

    return internship;
  }

  // ====================== LECTURER ======================

  async getSupervisedStudents(lecturerId: string) {
    return this.prisma.internships.findMany({
      where: { lecturer_id: BigInt(lecturerId) },
      include: { students: true },
    });
  }

  async updateStatus(
    lecturerId: string,
    internshipId: string,
    dto: UpdateInternshipStatusDto,
  ) {
    const internship = await this.prisma.internships.findUnique({
      where: { id: BigInt(internshipId) },
    });

    if (!internship) throw new NotFoundException('Không tìm thấy internship');

    if (internship.lecturer_id !== BigInt(lecturerId))
      throw new BadRequestException('Bạn không hướng dẫn internship này');

    const updated = await this.prisma.internships.update({
      where: { id: internship.id },
      data: {
        status: dto.status,
      },
    });

    return {
      message: 'Cập nhật trạng thái thành công',
      internship: updated,
    };
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

    return {
      message: 'Tạo kỳ thực tập thành công',
      term,
    };
  }

  async createTopic(lecturer_id: string, dto: CreateTopicDto) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturer_id) },
      select: { id: true },
    });

    if (!lecturer) {
      throw new BadRequestException('Giảng viên không tồn tại');
    }
    const topic = await this.prisma.internship_topics.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        company_name: dto.company_name ?? null,
        company_address: dto.company_address ?? null,
        created_by_lecturer_id: BigInt(lecturer.id),
      },
    });

    return {
      message: 'Tạo đề tài thành công',
      topic,
    };
  }

  async getAllInternships(page: number, limit: number) {
    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

    const [data, total] = await Promise.all([
      this.prisma.internships.findMany({
        skip,
        take: l,
        orderBy: { created_at: 'desc' },
        include: {
          students: true,
          lecturers: true,
          internship_terms: true,
          internship_topics: true,
        },
      }),
      this.prisma.internships.count(),
    ]);

    return buildPaginationResponse(data, total, p, l);
  }

  async getAllInternshipTerms(page: number, limit: number) {
    const { page: p, limit: l } = parsePaginationQuery({
      page,
      limit,
      maxLimit: 50,
    });
    const skip = (p - 1) * l;

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

    // Lấy tất cả internship thuộc các kỳ này
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
}
