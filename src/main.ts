import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express'
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

function logger(req: Request, res: Response, next: NextFunction) {
    console.log(`req ${req.url}`);
    next();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(logger)
  await app.listen(3000);
}
bootstrap();

