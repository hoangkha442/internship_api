import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient, attendance_records_status, internships_status } from '@prisma/client';

@Injectable()
export class AttendanceAutoAbsentJob {
  private readonly logger = new Logger(AttendanceAutoAbsentJob.name);
  private prisma = new PrismaClient();
  private TZ = 'Asia/Ho_Chi_Minh';

  private ymdInTz(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    const d = parts.find(p => p.type === 'day')!.value;
    return `${y}-${m}-${d}`; 
  }

  private weekday1to7InTz(date: Date, timeZone: string) {
    const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
    const map: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    return map[wd] ?? 0;
  }

  private dateOnlyUTCFromYYYYMMDD(s: string) {
    const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
    return new Date(Date.UTC(y, m - 1, d));
  }

  private parseWeekdays(setting?: string | null): number[] {
    if (!setting) return [];
    return setting
      .split(',')
      .map(x => parseInt(x.trim(), 10))
      .filter(n => n >= 1 && n <= 7);
  }

  private async getSetting(key: string): Promise<string | null> {
    const row = await this.prisma.system_settings.findUnique({
      where: { setting_key: key },
      select: { setting_value: true },
    });
    return row?.setting_value ?? null;
  }


  @Cron('0 5 0 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runDaily() {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const ymd = this.ymdInTz(yesterday, this.TZ);              
      const weekday = this.weekday1to7InTz(yesterday, this.TZ); 
      const dateUTC = this.dateOnlyUTCFromYYYYMMDD(ymd);

      const weekdaysSetting = await this.getSetting('attendance_required_weekdays');
      const requiredWeekdays = this.parseWeekdays(weekdaysSetting);

      if (!requiredWeekdays.length) {
        requiredWeekdays.push(1, 3, 5);
      }

      // Nếu hôm qua không nằm trong "ngày bắt buộc" => không tạo absent
      if (!requiredWeekdays.includes(weekday)) {
        return;
      }

      // Lấy internships đang active + trong khoảng thời gian thực tập
      const activeInternships = await this.prisma.internships.findMany({
        where: {
          status: { in: [internships_status.registered, internships_status.in_progress] },
          AND: [
            { OR: [{ start_date: null }, { start_date: { lte: dateUTC } }] },
            { OR: [{ end_date: null }, { end_date: { gte: dateUTC } }] },
          ],
        },
        select: { id: true },
      });

      if (!activeInternships.length) return;

      const internshipIds = activeInternships.map(x => x.id);

      // Check xem đã có record ngày đó chưa
      const existed = await this.prisma.attendance_records.findMany({
        where: {
          internship_id: { in: internshipIds },
          attendance_date: dateUTC,
        },
        select: { internship_id: true },
      });

      const existedSet = new Set(existed.map(x => x.internship_id.toString()));
      const missingIds = internshipIds.filter(id => !existedSet.has(id.toString()));

      if (!missingIds.length) return;

      await this.prisma.attendance_records.createMany({
        data: missingIds.map((internship_id) => ({
          internship_id,
          attendance_date: dateUTC,
          status: attendance_records_status.absent,
          reason: null,
          approved_by_lecturer_id: null,
          approved_at: null,
          rejection_reason: null,
          note: 'auto-absent (system)',
          client_ip: null,
          user_agent: null,
          verified_method: 'system',
        })),
        skipDuplicates: true,
      });

      this.logger.log(`Auto-absent OK: ${ymd} (VN) => created ${missingIds.length} records`);
    } catch (e: any) {
      this.logger.error(`Auto-absent FAILED: ${e?.message || e}`);
    }
  }
}
