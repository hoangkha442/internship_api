// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Query,
//   Req,
//   UseGuards,
// } from '@nestjs/common';
// import { UserService } from './user.service';
// import { ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
// import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// import { Roles } from 'src/auth/roles/roles.decorator';
// import { UpdateMeDto } from 'src/user/dto/update-me.dto';
// import { UpdatePasswordDto } from 'src/user/dto/update-password.dto';
// import { UpdateUserDto } from 'src/user/dto/update-user.dto';
// import { RolesGuard } from 'src/auth/roles/roles.guard';
// import { CreateUserDto } from 'src/user/dto/create-user.dto';

// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Controller('user')
// export class UserController {
//   constructor(private readonly userService: UserService) {}

//   // ================== SELF ==================
//   @Get('me')
//   getMe(@Req() req: any) {
//     return this.userService.getMe(req.user.userId);
//   }

//   @Patch('me')
//   @Roles('student', 'lecturer', 'admin')
//   updateMe(@Req() req: any, @Body() dto: UpdateMeDto) {
//     return this.userService.updateMe(req.user.userId, dto);
//   }

//   @Patch('me/password')
//   @Roles('student', 'lecturer', 'admin')
//   updatePassword(@Req() req: any, @Body() dto: UpdatePasswordDto) {
//     return this.userService.updatePassword(req.user.userId, dto);
//   }

//   // ==================== ADMIN ====================
//   @Get()
//   @Roles('admin')
//   @ApiQuery({
//     name: 'page',
//     required: false,
//     type: Number,
//     example: 1,
//     description: 'Trang (bắt đầu từ 1)',
//   })
//   @ApiQuery({
//     name: 'limit',
//     required: false,
//     type: Number,
//     example: 10,
//     description: 'Số bản ghi mỗi trang',
//   })
//   getAllUsers(@Query('page') page?: any, @Query('limit') limit?: any) {
//     return this.userService.getAllUsers(page, limit);
//   }

//   @Get(':id')
//   @Roles('admin')
//   getUserById(@Param('id') id: string) {
//     return this.userService.getUserById(id);
//   }

//   @Patch(':id')
//   @Roles('admin')
//   updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
//     return this.userService.updateUser(id, dto);
//   }

//   @Delete(':id')
//   @Roles('admin')
//   deleteUser(@Param('id') id: string) {
//     return this.userService.deleteUser(id);
//   }

//   @Post()
//   @Roles('admin')
//   createUser(@Body() dto: CreateUserDto) {
//     return this.userService.createUser(dto)
//   }
// }


import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import * as fs from 'fs';

import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';

import { UpdateMeDto } from 'src/user/dto/update-me.dto';
import { UpdatePasswordDto } from 'src/user/dto/update-password.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ================== SELF ==================
  @Get('me')
  getMe(@Req() req: any) {
    return this.userService.getMe(req.user.userId);
  }

  @Patch('me')
  @Roles('student', 'lecturer', 'admin')
  updateMe(@Req() req: any, @Body() dto: UpdateMeDto) {
    return this.userService.updateMe(req.user.userId, dto);
  }

  @Patch('me/password')
  @Roles('student', 'lecturer', 'admin')
  updatePassword(@Req() req: any, @Body() dto: UpdatePasswordDto) {
    return this.userService.updatePassword(req.user.userId, dto);
  }

  // ================== AVATAR (SELF) ==================
  @Post('me/avatar')
  @Roles('student', 'lecturer', 'admin')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = 'uploads/avatars';
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req: any, file, cb) => {
          const uid = req.user?.userId ?? 'unknown';
          const ext = extname(file.originalname || '').toLowerCase();
          cb(null, `${uid}-${Date.now()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(new BadRequestException('Chỉ cho phép file ảnh'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  uploadMyAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu file');
    return this.userService.updateMyAvatar(req.user.userId, file);
  }

  @Delete('me/avatar')
  @Roles('student', 'lecturer', 'admin')
  removeMyAvatar(@Req() req: any) {
    return this.userService.removeMyAvatar(req.user.userId);
  }

  // ==================== ADMIN ====================
  @Get()
  @Roles('admin')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Trang (bắt đầu từ 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số bản ghi mỗi trang',
  })
  getAllUsers(@Query('page') page?: any, @Query('limit') limit?: any) {
    return this.userService.getAllUsers(page, limit);
  }

  @Get(':id')
  @Roles('admin')
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Patch(':id')
  @Roles('admin')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post()
  @Roles('admin')
  createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }
}
