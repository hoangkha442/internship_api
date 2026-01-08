import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.enableCors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-ip'],
});
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  const config = new DocumentBuilder()
    .setTitle('INTERNSHIP MANAGEMENT APIs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalPipes(new ValidationPipe({  
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
