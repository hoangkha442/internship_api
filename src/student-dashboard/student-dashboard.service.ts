import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GetStudentDashboardDto,
  DashboardRange,
} from './dto/get-student-dashboard.dto';
import { PrismaClient } from '@prisma/client';
import * as dayjs from 'dayjs';

type DayKey = string; 

const toDayKey = (d?: string | Date | null): DayKey | null => {
  if (!d) return null;
  return dayjs(d).format('YYYY-MM-DD');
};

const buildDayAxis = (from: Date, to: Date) => {
  const start = dayjs(from).startOf('day');
  const end = dayjs(to).startOf('day');
  const days: string[] = [];
  let cur = start;
  while (cur.isBefore(end) || cur.isSame(end)) {
    days.push(cur.format('YYYY-MM-DD'));
    cur = cur.add(1, 'day');
  }
  return days;
};

const resolveWindow = (dto: GetStudentDashboardDto) => {
  const now = dayjs();
  const range: DashboardRange = dto.range ?? '14d';

  // ưu tiên from/to nếu có
  if (dto.from || dto.to) {
    const from = dto.from
      ? dayjs(dto.from).toDate()
      : now.subtract(14, 'day').toDate();
    const to = dto.to ? dayjs(dto.to).toDate() : now.toDate();
    return {
      from: dayjs(from).startOf('day').toDate(),
      to: dayjs(to).endOf('day').toDate(),
    };
  }

  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
  return {
    from: now
      .subtract(days - 1, 'day')
      .startOf('day')
      .toDate(),
    to: now.endOf('day').toDate(),
  };
};

@Injectable()
export class StudentDashboardService {
  constructor() {}
  prisma = new PrismaClient();
  async getDashboard(studentUserId: string, dto: GetStudentDashboardDto) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true, student_code: true },
    });
    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    const internship = dto.internship_id
      ? await this.prisma.internships.findUnique({
          where: { id: BigInt(dto.internship_id) },
          include: {
            internship_topics: true,
            internship_terms: true,
            lecturers: true,
          },
        })
      : await this.prisma.internships.findFirst({
          where: { student_id: BigInt(student.id) },
          orderBy: { updated_at: 'desc' },
          include: {
            internship_topics: true,
            internship_terms: true,
            lecturers: true,
          },
        });

    if (!internship) {
      // không có internship → trả payload rỗng nhưng hợp lệ
      return {
        internship: null,
        summary: {
          reports_total: 0,
          reports_submitted: 0,
          reports_needs_revision: 0,
          reports_reviewed: 0,
          reports_pending_review: 0,

          attendance_total: 0,
          attendance_pending_approval: 0,
          attendance_approved: 0,

          worklogs_total: 0,
          worklogs_pending_review: 0,
          worklogs_reviewed: 0,

          progress_percent: 0,
        },
        reportTrends: [],
        attendanceTrends: [],
        worklogTrends: [],
        window: resolveWindow(dto),
      };
    }

    // 3) time window
    const { from, to } = resolveWindow(dto);
    const axis = buildDayAxis(from, to);

    // 4) load data (NO RAW SQL)
    const [reports, worklogs, attendances] = await Promise.all([
      // ===== reports =====
      this.prisma.progress_reports.findMany({
        where: {
          internship_id: internship.id,
          submitted_at: { gte: from, lte: to },
        },
        select: {
          id: true,
          status: true,
          submitted_at: true,
          reviewed_at: true,
          is_pass: true,
          report_attachments: { select: { id: true } },
        },
        orderBy: { submitted_at: 'asc' },
      }),

      // ===== worklogs =====
      this.prisma.work_logs.findMany({
        where: {
          internship_id: internship.id,
          // nếu worklog dùng work_date thì lọc theo work_date, còn nếu không có thì dùng created_at
          OR: [
            { work_date: { gte: from, lte: to } as any },
            { created_at: { gte: from, lte: to } as any },
          ],
        } as any,
        select: {
          id: true,
          work_date: true,
          created_at: true,
          feedback: true,
          work_log_attachments: { select: { id: true } },
        },
        orderBy: { created_at: 'asc' },
      }),

      // ===== attendance =====
      this.prisma.attendance_records.findMany({
        where: {
          internship_id: internship.id,
          OR: [
            { attendance_date: { gte: from, lte: to } as any },
            { created_at: { gte: from, lte: to } as any },
          ],
        } as any,
        select: {
          id: true,
          status: true,
          attendance_date: true,
          approved_at: true,
          created_at: true,
        },
        orderBy: { created_at: 'asc' },
      }),
    ]);

    // 5) SUMMARY
    const reports_submitted = reports.filter(
      (r) => r.status === 'submitted',
    ).length;
    const reports_needs_revision = reports.filter(
      (r) => r.status === 'needs_revision',
    ).length;
    const reports_reviewed = reports.filter(
      (r) => r.status === 'reviewed',
    ).length;

    // pending review = report đã nộp nhưng chưa reviewed
    const reports_pending_review = reports.filter(
      (r) => r.status === 'submitted',
    ).length;

    const attendance_total = attendances.length;
    const attendance_pending_approval = attendances.filter(
      (a) => !a.approved_at,
    ).length;
    const attendance_approved = attendances.filter(
      (a) => !!a.approved_at,
    ).length;

    const worklogs_total = worklogs.length;
    const worklogs_reviewed = worklogs.filter(
      (w) => !!(w.feedback && String(w.feedback).trim()),
    ).length;
    const worklogs_pending_review = worklogs_total - worklogs_reviewed;

    const progress_percent = Number(internship.progress_percent ?? 0);

    // 6) TRENDS (fill zero for every day in axis)
    const reportTrendMap: Record<DayKey, any> = {};
    const attendanceTrendMap: Record<DayKey, any> = {};
    const worklogTrendMap: Record<DayKey, any> = {};

    for (const d of axis) {
      reportTrendMap[d] = {
        day: d,
        submitted: 0,
        reviewed: 0,
        needs_revision: 0,
      };
      attendanceTrendMap[d] = { day: d, pending: 0, approved: 0, total: 0 };
      worklogTrendMap[d] = { day: d, total: 0, pending: 0, reviewed: 0 };
    }

    for (const r of reports) {
      const k = toDayKey(r.submitted_at);
      if (!k || !reportTrendMap[k]) continue;
      if (r.status === 'submitted') reportTrendMap[k].submitted += 1;
      else if (r.status === 'reviewed') reportTrendMap[k].reviewed += 1;
      else if (r.status === 'needs_revision')
        reportTrendMap[k].needs_revision += 1;
    }

    for (const a of attendances) {
      const k = toDayKey((a as any).attendance_date ?? a.created_at);
      if (!k || !attendanceTrendMap[k]) continue;
      attendanceTrendMap[k].total += 1;
      if (a.approved_at) attendanceTrendMap[k].approved += 1;
      else attendanceTrendMap[k].pending += 1;
    }

    for (const w of worklogs) {
      const k = toDayKey((w as any).work_date ?? w.created_at);
      if (!k || !worklogTrendMap[k]) continue;
      worklogTrendMap[k].total += 1;
      const reviewed = !!(w.feedback && String(w.feedback).trim());
      if (reviewed) worklogTrendMap[k].reviewed += 1;
      else worklogTrendMap[k].pending += 1;
    }

    return {
      window: { from, to },

      internship: {
        id: String(internship.id),
        status: internship.status ?? null,
        progress_percent,
        term: internship.internship_terms
          ? {
              id: String(internship.internship_terms.id),
              term_name: internship.internship_terms.term_name,
              start_date: internship.internship_terms.start_date,
              end_date: internship.internship_terms.end_date,
              total_weeks: internship.internship_terms.total_weeks,
            }
          : null,
        topic: internship.internship_topics
          ? {
              id: String(internship.internship_topics.id),
              title: internship.internship_topics.title,
              description: internship.internship_topics.description,
              company_name: internship.internship_topics.company_name,
              company_address: internship.internship_topics.company_address,
            }
          : null,
        lecturer: internship.lecturers
          ? {
              id: String(internship.lecturers.id),
              lecturer_code: internship.lecturers.lecturer_code,
              department: internship.lecturers.department,
              phone: internship.lecturers.phone,
            }
          : null,
      },

      summary: {
        reports_total: reports.length,
        reports_submitted,
        reports_needs_revision,
        reports_reviewed,
        reports_pending_review,

        attendance_total,
        attendance_pending_approval,
        attendance_approved,

        worklogs_total,
        worklogs_pending_review,
        worklogs_reviewed,

        progress_percent,
      },

      reportTrends: axis.map((d) => reportTrendMap[d]),
      attendanceTrends: axis.map((d) => attendanceTrendMap[d]),
      worklogTrends: axis.map((d) => worklogTrendMap[d]),
    };
  }
}
