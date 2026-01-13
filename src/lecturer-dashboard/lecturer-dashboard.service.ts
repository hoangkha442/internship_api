import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { LecturerDashboardQueryDto } from "./dto/lecturer-dashboard-query.dto";

type DayCount = { day: string; count: number };

@Injectable()
export class LecturerDashboardService {
  constructor() {}
prisma = new PrismaClient();
  // =========================
  // Helpers
  // =========================
  private toBigIntId(id?: string): bigint | undefined {
    if (!id) return undefined;
    try {
      return BigInt(id);
    } catch {
      return undefined;
    }
  }

  private parseDateTime(input?: string): Date | undefined {
    if (!input) return undefined;
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return undefined;
    return d;
  }

  // For DATE columns (attendance_date/work_date)
  private parseDateOnly(input?: string): string | undefined {
    if (!input) return undefined;
    // Accept ISO -> take YYYY-MM-DD
    if (input.includes("T")) return input.slice(0, 10);
    // If already YYYY-MM-DD -> ok
    return input;
  }

  private applyRangePreset(q: LecturerDashboardQueryDto): { from?: string; to?: string } {
    // Nếu user truyền from/to thì ưu tiên from/to
    if (q.from || q.to) return { from: q.from, to: q.to };
    if (!q.range) return { from: undefined, to: undefined };

    const now = new Date();
    const to = now.toISOString();
    const days = q.range === "7d" ? 7 : q.range === "14d" ? 14 : 30;
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const from = fromDate.toISOString();
    return { from, to };
  }

  private async getLecturerIdByUserIdOrThrow(userId: string): Promise<bigint> {
    const lec = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(userId) },
      select: { id: true },
    });
    if (!lec) throw new NotFoundException("Giảng viên không tồn tại");
    return lec.id;
  }

  // =========================
  // SUMMARY (cards)
  // =========================
  async getSummary(lecturerUserId: string, query: LecturerDashboardQueryDto) {
    const lecturerId = await this.getLecturerIdByUserIdOrThrow(lecturerUserId);

    const termId = this.toBigIntId(query.term_id);
    const internshipId = this.toBigIntId(query.internship_id);

    const { from, to } = this.applyRangePreset(query);

    // Filter SQL fragments
    const whereTerm = termId ? Prisma.sql`AND i.term_id = ${termId}` : Prisma.empty;
    const whereIntern = internshipId ? Prisma.sql`AND i.id = ${internshipId}` : Prisma.empty;

    // for reports (datetime)
    const fromDT = this.parseDateTime(from);
    const toDT = this.parseDateTime(to);
    const whereFromReport = fromDT ? Prisma.sql`AND pr.submitted_at >= ${fromDT}` : Prisma.empty;
    const whereToReport = toDT ? Prisma.sql`AND pr.submitted_at <= ${toDT}` : Prisma.empty;

    // for attendance/worklog (date)
    const fromD = this.parseDateOnly(from);
    const toD = this.parseDateOnly(to);
    const whereFromAtt = fromD ? Prisma.sql`AND ar.attendance_date >= ${fromD}` : Prisma.empty;
    const whereToAtt = toD ? Prisma.sql`AND ar.attendance_date <= ${toD}` : Prisma.empty;
    const whereFromWl = fromD ? Prisma.sql`AND wl.work_date >= ${fromD}` : Prisma.empty;
    const whereToWl = toD ? Prisma.sql`AND wl.work_date <= ${toD}` : Prisma.empty;

    const [internshipsRow] = await this.prisma.$queryRaw<
      Array<{ internships_total: bigint; students_total: bigint }>
    >(Prisma.sql`
      SELECT
        COUNT(DISTINCT i.id) AS internships_total,
        COUNT(DISTINCT i.student_id) AS students_total
      FROM internships i
      WHERE i.lecturer_id = ${lecturerId}
      ${whereTerm}
      ${whereIntern}
    `);

    const [reportsRow] = await this.prisma.$queryRaw<
      Array<{ submitted_pending: bigint; needs_revision: bigint; reviewed: bigint }>
    >(Prisma.sql`
      SELECT
        SUM(CASE WHEN pr.status = 'submitted' THEN 1 ELSE 0 END) AS submitted_pending,
        SUM(CASE WHEN pr.status = 'needs_revision' THEN 1 ELSE 0 END) AS needs_revision,
        SUM(CASE WHEN pr.status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed
      FROM progress_reports pr
      JOIN internships i ON i.id = pr.internship_id
      WHERE i.lecturer_id = ${lecturerId}
        AND pr.submitted_at IS NOT NULL
        ${whereTerm}
        ${whereIntern}
        ${whereFromReport}
        ${whereToReport}
    `);

    const [attendanceRow] = await this.prisma.$queryRaw<
      Array<{ pending_approval: bigint; total: bigint }>
    >(Prisma.sql`
      SELECT
        SUM(CASE WHEN ar.approved_at IS NULL THEN 1 ELSE 0 END) AS pending_approval,
        COUNT(*) AS total
      FROM attendance_records ar
      JOIN internships i ON i.id = ar.internship_id
      WHERE i.lecturer_id = ${lecturerId}
        ${whereTerm}
        ${whereIntern}
        ${whereFromAtt}
        ${whereToAtt}
    `);

    const [worklogRow] = await this.prisma.$queryRaw<
      Array<{ pending_review: bigint; reviewed: bigint; total: bigint }>
    >(Prisma.sql`
      SELECT
        SUM(CASE WHEN wl.feedback IS NULL OR TRIM(wl.feedback) = '' THEN 1 ELSE 0 END) AS pending_review,
        SUM(CASE WHEN wl.feedback IS NOT NULL AND TRIM(wl.feedback) <> '' THEN 1 ELSE 0 END) AS reviewed,
        COUNT(*) AS total
      FROM work_logs wl
      JOIN internships i ON i.id = wl.internship_id
      WHERE i.lecturer_id = ${lecturerId}
        ${whereTerm}
        ${whereIntern}
        ${whereFromWl}
        ${whereToWl}
    `);

    return {
      internships_total: Number(internshipsRow?.internships_total || 0),
      students_total: Number(internshipsRow?.students_total || 0),

      reports_submitted_pending: Number(reportsRow?.submitted_pending || 0),
      reports_needs_revision: Number(reportsRow?.needs_revision || 0),
      reports_reviewed: Number(reportsRow?.reviewed || 0),

      attendance_pending_approval: Number(attendanceRow?.pending_approval || 0),
      attendance_total: Number(attendanceRow?.total || 0),

      worklogs_pending_review: Number(worklogRow?.pending_review || 0),
      worklogs_reviewed: Number(worklogRow?.reviewed || 0),
      worklogs_total: Number(worklogRow?.total || 0),
    };
  }

  // =========================
  // TRENDS: Reports
  // =========================
  async getReportTrends(lecturerUserId: string, query: LecturerDashboardQueryDto) {
    const lecturerId = await this.getLecturerIdByUserIdOrThrow(lecturerUserId);

    const termId = this.toBigIntId(query.term_id);
    const internshipId = this.toBigIntId(query.internship_id);
    const { from, to } = this.applyRangePreset(query);

    const whereTerm = termId ? Prisma.sql`AND i.term_id = ${termId}` : Prisma.empty;
    const whereIntern = internshipId ? Prisma.sql`AND i.id = ${internshipId}` : Prisma.empty;

    const fromDT = this.parseDateTime(from);
    const toDT = this.parseDateTime(to);
    const whereFrom = fromDT ? Prisma.sql`AND pr.submitted_at >= ${fromDT}` : Prisma.empty;
    const whereTo = toDT ? Prisma.sql`AND pr.submitted_at <= ${toDT}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{ day: string; submitted: bigint; reviewed: bigint; needs_revision: bigint }>
    >(Prisma.sql`
      SELECT
        DATE(pr.submitted_at) AS day,
        SUM(CASE WHEN pr.status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN pr.status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed,
        SUM(CASE WHEN pr.status = 'needs_revision' THEN 1 ELSE 0 END) AS needs_revision
      FROM progress_reports pr
      JOIN internships i ON i.id = pr.internship_id
      WHERE i.lecturer_id = ${lecturerId}
        AND pr.submitted_at IS NOT NULL
        ${whereTerm}
        ${whereIntern}
        ${whereFrom}
        ${whereTo}
      GROUP BY DATE(pr.submitted_at)
      ORDER BY day ASC
    `);

    return rows.map((r) => ({
      day: r.day,
      submitted: Number(r.submitted || 0),
      reviewed: Number(r.reviewed || 0),
      needs_revision: Number(r.needs_revision || 0),
    }));
  }

  // =========================
  // TRENDS: Attendance
  // =========================
  async getAttendanceTrends(lecturerUserId: string, query: LecturerDashboardQueryDto) {
    const lecturerId = await this.getLecturerIdByUserIdOrThrow(lecturerUserId);

    const termId = this.toBigIntId(query.term_id);
    const internshipId = this.toBigIntId(query.internship_id);
    const { from, to } = this.applyRangePreset(query);

    const whereTerm = termId ? Prisma.sql`AND i.term_id = ${termId}` : Prisma.empty;
    const whereIntern = internshipId ? Prisma.sql`AND i.id = ${internshipId}` : Prisma.empty;

    const fromD = this.parseDateOnly(from);
    const toD = this.parseDateOnly(to);
    const whereFrom = fromD ? Prisma.sql`AND ar.attendance_date >= ${fromD}` : Prisma.empty;
    const whereTo = toD ? Prisma.sql`AND ar.attendance_date <= ${toD}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        day: string;
        present: bigint;
        absent: bigint;
        late: bigint;
        excused: bigint;
        pending_approval: bigint;
      }>
    >(Prisma.sql`
      SELECT
        DATE(ar.attendance_date) AS day,
        SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) AS late,
        SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) AS excused,
        SUM(CASE WHEN ar.approved_at IS NULL THEN 1 ELSE 0 END) AS pending_approval
      FROM attendance_records ar
      JOIN internships i ON i.id = ar.internship_id
      WHERE i.lecturer_id = ${lecturerId}
        ${whereTerm}
        ${whereIntern}
        ${whereFrom}
        ${whereTo}
      GROUP BY DATE(ar.attendance_date)
      ORDER BY day ASC
    `);

    return rows.map((r) => ({
      day: r.day,
      present: Number(r.present || 0),
      absent: Number(r.absent || 0),
      late: Number(r.late || 0),
      excused: Number(r.excused || 0),
      pending_approval: Number(r.pending_approval || 0),
    }));
  }

  // =========================
  // TRENDS: Worklogs
  // =========================
  async getWorklogTrends(lecturerUserId: string, query: LecturerDashboardQueryDto) {
    const lecturerId = await this.getLecturerIdByUserIdOrThrow(lecturerUserId);

    const termId = this.toBigIntId(query.term_id);
    const internshipId = this.toBigIntId(query.internship_id);
    const { from, to } = this.applyRangePreset(query);

    const whereTerm = termId ? Prisma.sql`AND i.term_id = ${termId}` : Prisma.empty;
    const whereIntern = internshipId ? Prisma.sql`AND i.id = ${internshipId}` : Prisma.empty;

    const fromD = this.parseDateOnly(from);
    const toD = this.parseDateOnly(to);
    const whereFrom = fromD ? Prisma.sql`AND wl.work_date >= ${fromD}` : Prisma.empty;
    const whereTo = toD ? Prisma.sql`AND wl.work_date <= ${toD}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{ day: string; total: bigint; pending: bigint; reviewed: bigint }>
    >(Prisma.sql`
      SELECT
        DATE(wl.work_date) AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN wl.feedback IS NULL OR TRIM(wl.feedback) = '' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN wl.feedback IS NOT NULL AND TRIM(wl.feedback) <> '' THEN 1 ELSE 0 END) AS reviewed
      FROM work_logs wl
      JOIN internships i ON i.id = wl.internship_id
      WHERE i.lecturer_id = ${lecturerId}
        ${whereTerm}
        ${whereIntern}
        ${whereFrom}
        ${whereTo}
      GROUP BY DATE(wl.work_date)
      ORDER BY day ASC
    `);

    return rows.map((r) => ({
      day: r.day,
      total: Number(r.total || 0),
      pending: Number(r.pending || 0),
      reviewed: Number(r.reviewed || 0),
    }));
  }

  // =========================
  // ONE CALL: dashboard payload
  // =========================
  async getDashboard(lecturerUserId: string, query: LecturerDashboardQueryDto) {
    const [summary, reportTrends, attendanceTrends, worklogTrends] = await Promise.all([
      this.getSummary(lecturerUserId, query),
      this.getReportTrends(lecturerUserId, query),
      this.getAttendanceTrends(lecturerUserId, query),
      this.getWorklogTrends(lecturerUserId, query),
    ]);

    return { summary, reportTrends, attendanceTrends, worklogTrends };
  }
}
