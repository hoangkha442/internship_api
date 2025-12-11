import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
  global: true,
  secret: process.env.JWT_SECRET,
})
  ],
  controllers: [AuthController],
  providers: [AuthService,  JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
