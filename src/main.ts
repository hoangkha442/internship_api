import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle('INTERNSHIP MANAGEMENT APIs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.useGlobalPipes(new ValidationPipe({  // Cấu hình validation pipe để bắt lỗi DTO
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  (BigInt.prototype as any).toJSON = function () { // convert BigInt to string in JSON responses
    return this.toString();
  };

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
