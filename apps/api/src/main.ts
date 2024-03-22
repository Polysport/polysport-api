import { NestFactory } from '@nestjs/core';
import { DexModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { appConfig } from './app.config';

async function bootstrap() {
  const app = await NestFactory.create(DexModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors();
  await app.listen(appConfig.port);
}
bootstrap();
