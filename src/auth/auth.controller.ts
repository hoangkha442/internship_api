import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Post('signup')
  // signup(@Body() dto: CreateAuthDto) {
  //   return this.authService.signup(dto)
  // }

  @Post('login')
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto)
  }

  @Post('refresh')
  refresh(@Body('refresh_token') token: string) {
    return this.authService.refreshToken(token)
  }
}
