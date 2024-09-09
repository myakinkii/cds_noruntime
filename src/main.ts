import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express'
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

function logger(req: Request, res: Response, next: NextFunction) {
    console.log(`req ${req.url}`);
    next();
};

async function bootstrap({adapters, middlewares}) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const port = process.env.PORT || 3000

  app.use(logger)

  const { before, after } = middlewares

  adapters.forEach( (adapter) => {
    console.log(`mount odata adapter for ${adapter.path}`)
    app.use(adapter.path, before, adapter, after)
  })

  await app.listen(port)

  console.log(`nest running at http://localhost:${port}`)
}

bootstrap({ adapters:[], middlewares:{} })
// require('../srv/lib/cds_init').cds_init().then(bootstrap)
