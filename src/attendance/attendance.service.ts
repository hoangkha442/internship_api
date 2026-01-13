import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrismaClient,
  attendance_records_status,
  internships_status,
} from '@prisma/client';
import * as ipaddr from 'ipaddr.js';
import { AttendanceLocationDto } from './dto/attendance-location.dto';
import { RequestLeaveDto } from './dto/request-leave.dto';
import { CreateAllowedNetworkDto, UpdateAllowedNetworkDto } from './dto/admin-network.dto';
import { parsePaginationQuery, buildPaginationResponse } from 'src/common/helpers/pagination.helper';

@Injectable()
export class AttendanceService {
  prisma = new PrismaClient();

  // ====== cấu hình khuôn viên (bạn có thể chuyển sang system_settings/env sau) ======
  private CAMPUS_LAT = 10.762622;
  private CAMPUS_LNG = 106.660172;
  private CAMPUS_RADIUS_M = 600;
  private MAX_ACCURACY_M = 120;

  // ====== SETTINGS / REQUIRED DAYS (VN timezone) ======
  private TZ = 'Asia/Ho_Chi_Minh';

  private ymdInTz(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const y = parts.find((p) => p.type === 'year')!.value;
    const m = parts.find((p) => p.type === 'month')!.value;
    const d = parts.find((p) => p.type === 'day')!.value;
    return `${y}-${m}-${d}`; // YYYY-MM-DD
  }

  private weekday1to7InTz(date: Date, timeZone: string) {
    const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date); // Mon/Tue...
    const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    return map[wd] ?? 0;
  }

  private parseWeekdays(setting?: string | null): number[] {
    if (!setting) return [];
    return setting
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => n >= 1 && n <= 7);
  }

  private async getSetting(key: string): Promise<string | null> {
    const row = await this.prisma.system_settings.findUnique({
      where: { setting_key: key },
      select: { setting_value: true },
    });
    return row?.setting_value ?? null;
  }

  private async ensureTodayIsAllowedAttendanceDay() {
    const onlyRequired = (await this.getSetting('attendance_only_required_days')) === 'true';
    if (!onlyRequired) return;

    const weekdaysSetting = await this.getSetting('attendance_required_weekdays');
    const required = this.parseWeekdays(weekdaysSetting);
    const requiredWeekdays = required.length ? required : [1, 3, 5]; // default T2-T4-T6

    const now = new Date();
    const weekday = this.weekday1to7InTz(now, this.TZ);

    if (!requiredWeekdays.includes(weekday)) {
      throw new BadRequestException('Hôm nay không nằm trong lịch điểm danh bắt buộc của tuần');
    }
  }
  // ====== helpers DATE (để không lệch ngày ở VN với @db.Date) ======
  private dateOnlyUTCFromLocalNow() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  private parseDateOnlyUTC(s: string) {
    // expect YYYY-MM-DD
    const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
    if (!y || !m || !d) throw new BadRequestException('date không hợp lệ (YYYY-MM-DD)');
    return new Date(Date.UTC(y, m - 1, d));
  }

  private addDaysUTC(dateUTC: Date, days: number) {
    return new Date(dateUTC.getTime() + days * 86400000);
  }

  // ====== helpers TIME (để không lệch giờ VN với @db.Time) ======
  private makeTimeUTCFromLocalNow() {
    const now = new Date();
    return new Date(Date.UTC(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds(), 0));
  }

  private toHHmmFromTimeUTC(t?: Date | null) {
    if (!t) return null;
    const hh = String(t.getUTCHours()).padStart(2, '0');
    const mm = String(t.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // ====== GPS ======
  private haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  private isGpsAllowed(dto?: AttendanceLocationDto) {
    if (!dto?.lat || !dto?.lng) return false;
    if (dto.accuracy_m != null && dto.accuracy_m > this.MAX_ACCURACY_M) return false;

    const d = this.haversineMeters(dto.lat, dto.lng, this.CAMPUS_LAT, this.CAMPUS_LNG);
    return d <= this.CAMPUS_RADIUS_M;
  }

  // ====== IP ======
  private getClientIp(req: any): string {
    const isProd = process.env.NODE_ENV === 'production';

    // DEV override
    if (!isProd) {
      const devIp = req.headers['x-dev-ip'];
      if (devIp) return String(devIp).trim();
    }

    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();

    return req.ip || req.socket?.remoteAddress || '';
  }

  private ipInCidr(ip: string, cidr: string): boolean {
    try {
      let addr = ipaddr.parse(ip);

      // ipv4-mapped ipv6 -> ipv4
      if (addr.kind() === 'ipv6' && (addr as any).isIPv4MappedAddress?.()) {
        addr = (addr as any).toIPv4Address();
      }

      const [range, bits] = ipaddr.parseCIDR(cidr);
      if (addr.kind() !== range.kind()) return false;

      if (addr.kind() === 'ipv4') {
        return (addr as ipaddr.IPv4).match(range as ipaddr.IPv4, bits);
      }
      return (addr as ipaddr.IPv6).match(range as ipaddr.IPv6, bits);
    } catch {
      return false;
    }
  }

  private async isIpAllowed(ip: string) {
    const nets = await this.prisma.allowed_networks.findMany({
      where: { is_active: true },
      select: { cidr: true },
    });
    return nets.some((n) => this.ipInCidr(ip, n.cidr));
  }

  // ====== resolve current internship ======
  private async getMyInternship(studentUserId: string) {
    const student = await this.prisma.students.findFirst({
      where: { user_id: BigInt(studentUserId) },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Sinh viên không tồn tại');

    const internship = await this.prisma.internships.findFirst({
      where: {
        student_id: student.id,
        status: { in: [internships_status.registered, internships_status.in_progress] },
      },
      select: { id: true, lecturer_id: true },
      orderBy: { created_at: 'desc' },
    });

    if (!internship) throw new NotFoundException('Không tìm thấy internship đang hoạt động');
    return internship;
  }

  private async getLecturerIdByUserId(lecturerUserId: string) {
    const lecturer = await this.prisma.lecturers.findFirst({
      where: { user_id: BigInt(lecturerUserId) },
      select: { id: true },
    });
    if (!lecturer) throw new NotFoundException('Giảng viên không tồn tại');
    return lecturer.id;
  }

  // ========================= STUDENT APIs =========================

  async studentToday(req: any) {
    const internship = await this.getMyInternship(req.user.userId);
    const today = this.dateOnlyUTCFromLocalNow();

    const record = await this.prisma.attendance_records.findUnique({
      where: { internship_id_attendance_date: { internship_id: internship.id, attendance_date: today } },
    });

    return {
      record: record
        ? {
            ...record,
            check_in_hhmm: this.toHHmmFromTimeUTC(record.check_in_time),
            check_out_hhmm: this.toHHmmFromTimeUTC(record.check_out_time),
          }
        : null,
    };
  }

  async studentHistory(req: any, from?: string, to?: string, page?: number, limit?: number) {
    const internship = await this.getMyInternship(req.user.userId);

    const { page: p, limit: l } = parsePaginationQuery({ page, limit, maxLimit: 50 });
    const skip = (p - 1) * l;

    const nowLocal = new Date();
    const defaultTo = new Date(Date.UTC(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()));
    const defaultFrom = this.addDaysUTC(defaultTo, -30);

    const fromUTC = from ? this.parseDateOnlyUTC(from) : defaultFrom;
    const toUTC = to ? this.parseDateOnlyUTC(to) : defaultTo;
    const toExclusive = this.addDaysUTC(toUTC, 1);

    const [items, total] = await Promise.all([
      this.prisma.attendance_records.findMany({
        where: {
          internship_id: internship.id,
          attendance_date: { gte: fromUTC, lt: toExclusive },
        },
        orderBy: { attendance_date: 'desc' },
        skip,
        take: l,
      }),
      this.prisma.attendance_records.count({
        where: {
          internship_id: internship.id,
          attendance_date: { gte: fromUTC, lt: toExclusive },
        },
      }),
    ]);

    const mapped = items.map((r) => ({
      ...r,
      check_in_hhmm: this.toHHmmFromTimeUTC(r.check_in_time),
      check_out_hhmm: this.toHHmmFromTimeUTC(r.check_out_time),
    }));
    return buildPaginationResponse(mapped, total, p, l);
  }

  async studentCheckIn(req: any, dto: AttendanceLocationDto) {
     await this.ensureTodayIsAllowedAttendanceDay();
    const internship = await this.getMyInternship(req.user.userId);

    const ip = this.getClientIp(req);
    const ua = String(req.headers['user-agent'] || '').slice(0, 255);

    const ipOk = await this.isIpAllowed(ip);
    const gpsOk = this.isGpsAllowed(dto);

    if (!ipOk && !gpsOk) {
      throw new ForbiddenException('Bạn phải ở WiFi trường hoặc trong khu vực trường để điểm danh');
    }

    const today = this.dateOnlyUTCFromLocalNow();
    const timeUTC = this.makeTimeUTCFromLocalNow();

    // lateCutoff 09:00 local => compare minutes
    const nowLocal = new Date();
    const nowMin = nowLocal.getHours() * 60 + nowLocal.getMinutes();
    const lateCutoffMin = 9 * 60;
    const status =
      nowMin > lateCutoffMin ? attendance_records_status.late : attendance_records_status.present;

    const existed = await this.prisma.attendance_records.findUnique({
      where: { internship_id_attendance_date: { internship_id: internship.id, attendance_date: today } },
      select: { check_in_time: true },
    });
    if (existed?.check_in_time) throw new BadRequestException('Bạn đã check-in hôm nay');

    const record = await this.prisma.attendance_records.upsert({
      where: { internship_id_attendance_date: { internship_id: internship.id, attendance_date: today } },
      create: {
        internship_id: internship.id,
        attendance_date: today,
        check_in_time: timeUTC,
        status,
        checkin_lat: dto.lat ?? null,
        checkin_lng: dto.lng ?? null,
        checkin_accuracy_m: dto.accuracy_m ?? null,
        client_ip: ip || null,
        user_agent: ua || null,
        verified_method: ipOk && gpsOk ? 'ip_gps' : ipOk ? 'ip' : 'gps',
      },
      update: {
        check_in_time: timeUTC,
        status,
        checkin_lat: dto.lat ?? null,
        checkin_lng: dto.lng ?? null,
        checkin_accuracy_m: dto.accuracy_m ?? null,
        client_ip: ip || null,
        user_agent: ua || null,
        verified_method: ipOk && gpsOk ? 'ip_gps' : ipOk ? 'ip' : 'gps',
      },
    });

    return {
      message: 'Check-in thành công',
      record: {
        ...record,
        check_in_hhmm: this.toHHmmFromTimeUTC(record.check_in_time),
        check_out_hhmm: this.toHHmmFromTimeUTC(record.check_out_time),
      },
    };
  }

  async studentCheckOut(req: any, dto: AttendanceLocationDto) {
        await this.ensureTodayIsAllowedAttendanceDay();
    const internship = await this.getMyInternship(req.user.userId);

    const ip = this.getClientIp(req);
    const ua = String(req.headers['user-agent'] || '').slice(0, 255);

    const ipOk = await this.isIpAllowed(ip);
    const gpsOk = this.isGpsAllowed(dto);

    if (!ipOk && !gpsOk) {
      throw new ForbiddenException('Bạn phải ở WiFi trường hoặc trong khu vực trường để điểm danh');
    }

    const today = this.dateOnlyUTCFromLocalNow();
    const record = await this.prisma.attendance_records.findUnique({
      where: { internship_id_attendance_date: { internship_id: internship.id, attendance_date: today } },
    });

    if (!record?.check_in_time) throw new BadRequestException('Bạn chưa check-in hôm nay');
    if (record.check_out_time) throw new BadRequestException('Bạn đã check-out hôm nay');

    const timeUTC = this.makeTimeUTCFromLocalNow();

    const updated = await this.prisma.attendance_records.update({
      where: { id: record.id },
      data: {
        check_out_time: timeUTC,
        checkout_lat: dto.lat ?? null,
        checkout_lng: dto.lng ?? null,
        checkout_accuracy_m: dto.accuracy_m ?? null,
        client_ip: ip || null,
        user_agent: ua || null,
        verified_method: ipOk && gpsOk ? 'ip_gps' : ipOk ? 'ip' : 'gps',
      },
    });

    return {
      message: 'Check-out thành công',
      record: {
        ...updated,
        check_in_hhmm: this.toHHmmFromTimeUTC(updated.check_in_time),
        check_out_hhmm: this.toHHmmFromTimeUTC(updated.check_out_time),
      },
    };
  }

  async studentRequestLeave(req: any, dto: RequestLeaveDto) {
   if (
  dto.status !== attendance_records_status.absent &&
  dto.status !== attendance_records_status.excused
) {
  throw new BadRequestException('status xin nghỉ chỉ được absent hoặc excused');
}

    const internship = await this.getMyInternship(req.user.userId);
    const dateUTC = this.parseDateOnlyUTC(dto.date);

    const existed = await this.prisma.attendance_records.findUnique({
      where: { internship_id_attendance_date: { internship_id: internship.id, attendance_date: dateUTC } },
    });

    // nếu đã check-in/out thì không cho xin nghỉ đè
    if (existed?.check_in_time || existed?.check_out_time) {
      throw new BadRequestException('Ngày này đã có check-in/out, không thể xin nghỉ');
    }

    // upsert request
    const record = await this.prisma.attendance_records.upsert({
      where: { internship_id_attendance_date: { internship_id: internship.id, attendance_date: dateUTC } },
      create: {
        internship_id: internship.id,
        attendance_date: dateUTC,
        status: dto.status,
        reason: dto.reason ?? null,
        approved_by_lecturer_id: null,
        approved_at: null,
        rejection_reason: null,
      },
      update: {
        status: dto.status,
        reason: dto.reason ?? null,
        approved_by_lecturer_id: null,
        approved_at: null,
        rejection_reason: null,
      },
    });

    return { message: 'Gửi xin nghỉ thành công', record };
  }

  // ========================= LECTURER APIs =========================

  // danh sách điểm danh theo ngày/khoảng (SV thuộc GV này)
  async lecturerList(req: any, date?: string, from?: string, to?: string, page?: number, limit?: number) {
    const lecturerId = await this.getLecturerIdByUserId(req.user.userId);
    const { page: p, limit: l } = parsePaginationQuery({ page, limit, maxLimit: 50 });
    const skip = (p - 1) * l;

    let fromUTC: Date | null = null;
    let toExclusive: Date | null = null;

    if (date) {
      fromUTC = this.parseDateOnlyUTC(date);
      toExclusive = this.addDaysUTC(fromUTC, 1);
    } else {
      const nowLocal = new Date();
      const defaultTo = new Date(Date.UTC(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()));
      const defaultFrom = this.addDaysUTC(defaultTo, -7);

      fromUTC = from ? this.parseDateOnlyUTC(from) : defaultFrom;
      const toUTC = to ? this.parseDateOnlyUTC(to) : defaultTo;
      toExclusive = this.addDaysUTC(toUTC, 1);
    }

    const where = {
      internships: {
        lecturer_id: BigInt(lecturerId),
      },
      attendance_date: { gte: fromUTC!, lt: toExclusive! },
    };

    const [items, total] = await Promise.all([
      this.prisma.attendance_records.findMany({
        where,
        skip,
        take: l,
        orderBy: { attendance_date: 'desc' },
        include: {
          internships: {
            include: {
              students: { include: { users: true, classes: true } },
            },
          },
        },
      }),
      this.prisma.attendance_records.count({ where }),
    ]);

    const mapped = items.map((r) => ({
      ...r,
      check_in_hhmm: this.toHHmmFromTimeUTC(r.check_in_time),
      check_out_hhmm: this.toHHmmFromTimeUTC(r.check_out_time),
      student: {
        id: r.internships.students.id.toString(),
        student_code: r.internships.students.student_code,
        full_name: r.internships.students.users.full_name,
        email: r.internships.students.users.email,
        class_name: r.internships.students.classes?.class_name ?? null,
        class_code: r.internships.students.classes?.class_code ?? null,
      },
      internship_id: r.internship_id.toString(),
    }));

    return buildPaginationResponse(mapped, total, p, l);
  }

  // request xin nghỉ chờ duyệt (absent/excused, approved_at null, rejection_reason null)
  async lecturerPendingRequests(req: any, from?: string, to?: string, page?: number, limit?: number) {
    const lecturerId = await this.getLecturerIdByUserId(req.user.userId);
    const { page: p, limit: l } = parsePaginationQuery({ page, limit, maxLimit: 50 });
    const skip = (p - 1) * l;

    const nowLocal = new Date();
    const defaultTo = new Date(Date.UTC(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()));
    const defaultFrom = this.addDaysUTC(defaultTo, -14);

    const fromUTC = from ? this.parseDateOnlyUTC(from) : defaultFrom;
    const toUTC = to ? this.parseDateOnlyUTC(to) : defaultTo;
    const toExclusive = this.addDaysUTC(toUTC, 1);

    const where = {
      internships: { lecturer_id: BigInt(lecturerId) },
      attendance_date: { gte: fromUTC, lt: toExclusive },
      status: { in: [attendance_records_status.absent, attendance_records_status.excused] },
      approved_at: null,
      rejection_reason: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.attendance_records.findMany({
        where,
        skip,
        take: l,
        orderBy: { attendance_date: 'desc' },
        include: {
          internships: {
            include: {
              students: { include: { users: true, classes: true } },
            },
          },
        },
      }),
      this.prisma.attendance_records.count({ where }),
    ]);

    const mapped = items.map((r) => ({
      ...r,
      student: {
        id: r.internships.students.id.toString(),
        student_code: r.internships.students.student_code,
        full_name: r.internships.students.users.full_name,
        email: r.internships.students.users.email,
        class_name: r.internships.students.classes?.class_name ?? null,
        class_code: r.internships.students.classes?.class_code ?? null,
      },
      internship_id: r.internship_id.toString(),
    }));

    return buildPaginationResponse(mapped, total, p, l);
  }

  async lecturerApprove(req: any, attendanceId: string, dto: { note?: string }) {
    const lecturerId = await this.getLecturerIdByUserId(req.user.userId);

    const record = await this.prisma.attendance_records.findUnique({
      where: { id: BigInt(attendanceId) },
      include: { internships: true },
    });
    if (!record) throw new NotFoundException('Attendance record không tồn tại');
    if (record.internships.lecturer_id !== BigInt(lecturerId)) {
      throw new ForbiddenException('Bạn không có quyền duyệt record này');
    }

    const updated = await this.prisma.attendance_records.update({
      where: { id: record.id },
      data: {
        approved_by_lecturer_id: BigInt(lecturerId),
        approved_at: new Date(),
        rejection_reason: null,
        note: dto.note ?? null,
      },
    });

    return { message: 'Duyệt thành công', record: updated };
  }

  async lecturerReject(req: any, attendanceId: string, dto: { rejection_reason: string; note?: string }) {
    if (!dto.rejection_reason?.trim()) throw new BadRequestException('Cần rejection_reason');

    const lecturerId = await this.getLecturerIdByUserId(req.user.userId);

    const record = await this.prisma.attendance_records.findUnique({
      where: { id: BigInt(attendanceId) },
      include: { internships: true },
    });
    if (!record) throw new NotFoundException('Attendance record không tồn tại');
    if (record.internships.lecturer_id !== BigInt(lecturerId)) {
      throw new ForbiddenException('Bạn không có quyền từ chối record này');
    }

    const updated = await this.prisma.attendance_records.update({
      where: { id: record.id },
      data: {
        approved_by_lecturer_id: BigInt(lecturerId),
        approved_at: new Date(),
        rejection_reason: dto.rejection_reason,
        note: dto.note ?? null,
      },
    });

    return { message: 'Từ chối thành công', record: updated };
  }

  // ========================= ADMIN APIs =========================

  async adminListAll(
    req: any,
    q: {
      from?: string;
      to?: string;
      status?: attendance_records_status;
      lecturer_id?: string;
      student_id?: string;
      class_id?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { page: p, limit: l } = parsePaginationQuery({ page: q.page, limit: q.limit, maxLimit: 100 });
    const skip = (p - 1) * l;

    const nowLocal = new Date();
    const defaultTo = new Date(Date.UTC(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()));
    const defaultFrom = this.addDaysUTC(defaultTo, -30);

    const fromUTC = q.from ? this.parseDateOnlyUTC(q.from) : defaultFrom;
    const toUTC = q.to ? this.parseDateOnlyUTC(q.to) : defaultTo;
    const toExclusive = this.addDaysUTC(toUTC, 1);

    const where: any = {
      attendance_date: { gte: fromUTC, lt: toExclusive },
    };

    if (q.status) where.status = q.status;

    if (q.lecturer_id) {
      where.internships = where.internships || {};
      where.internships.lecturer_id = BigInt(q.lecturer_id);
    }

    if (q.student_id) {
      where.internships = where.internships || {};
      where.internships.student_id = BigInt(q.student_id);
    }

    if (q.class_id) {
      // filter class qua students
      where.internships = where.internships || {};
      where.internships.students = { class_id: BigInt(q.class_id) };
    }

    const [items, total] = await Promise.all([
      this.prisma.attendance_records.findMany({
        where,
        skip,
        take: l,
        orderBy: { attendance_date: 'desc' },
        include: {
          internships: {
            include: {
              students: { include: { users: true, classes: true } },
              lecturers: { include: { users: true } },
            },
          },
        },
      }),
      this.prisma.attendance_records.count({ where }),
    ]);

    const mapped = items.map((r) => ({
      ...r,
      check_in_hhmm: this.toHHmmFromTimeUTC(r.check_in_time),
      check_out_hhmm: this.toHHmmFromTimeUTC(r.check_out_time),
      student: {
        id: r.internships.students.id.toString(),
        student_code: r.internships.students.student_code,
        full_name: r.internships.students.users.full_name,
        email: r.internships.students.users.email,
        class_name: r.internships.students.classes?.class_name ?? null,
        class_code: r.internships.students.classes?.class_code ?? null,
      },
      lecturer: {
        id: r.internships.lecturers.id.toString(),
        lecturer_code: r.internships.lecturers.lecturer_code,
        full_name: r.internships.lecturers.users?.full_name ?? null,
        email: r.internships.lecturers.users?.email ?? null,
      },
      internship_id: r.internship_id.toString(),
    }));

    return buildPaginationResponse(mapped, total, p, l);
  }

  // -------- allowed networks CRUD --------
  async adminGetNetworks(page?: number, limit?: number) {
    const { page: p, limit: l } = parsePaginationQuery({ page, limit, maxLimit: 100 });
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.allowed_networks.findMany({
        skip,
        take: l,
        orderBy: { id: 'desc' },
      }),
      this.prisma.allowed_networks.count(),
    ]);

    return buildPaginationResponse(items, total, p, l);
  }

  async adminCreateNetwork(dto: CreateAllowedNetworkDto) {
    // validate CIDR basic
    try { ipaddr.parseCIDR(dto.cidr); } catch { throw new BadRequestException('CIDR không hợp lệ'); }

    const created = await this.prisma.allowed_networks.create({
      data: { name: dto.name, cidr: dto.cidr, is_active: true },
    });
    return { message: 'Tạo network thành công', network: created };
  }

  async adminUpdateNetwork(id: string, dto: UpdateAllowedNetworkDto) {
    if (dto.cidr) {
      try { ipaddr.parseCIDR(dto.cidr); } catch { throw new BadRequestException('CIDR không hợp lệ'); }
    }

    const updated = await this.prisma.allowed_networks.update({
      where: { id: BigInt(id) },
      data: {
        name: dto.name ?? undefined,
        cidr: dto.cidr ?? undefined,
        is_active: dto.is_active ?? undefined,
      },
    });
    return { message: 'Cập nhật network thành công', network: updated };
  }

  async adminDeleteNetwork(id: string) {
    await this.prisma.allowed_networks.delete({ where: { id: BigInt(id) } });
    return { message: 'Xoá network thành công' };
  }
}
