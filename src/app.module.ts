import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { InternshipsModule } from './internships/internships.module';
import { WorklogModule } from './worklog/worklog.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [ConfigModule.forRoot() ,AuthModule, UserModule,  InternshipsModule, WorklogModule, AttendanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
