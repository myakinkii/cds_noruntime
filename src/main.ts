import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express'
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './exception.filter';

function logger(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url}`);
    next();
};

async function bootstrap({ adapters, middlewares }) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)
    const port = process.env.PORT || 3000

    app.use(logger)
    app.useGlobalFilters(new HttpExceptionFilter());

    const { before, after } = middlewares

    adapters.forEach((adapter) => {
        console.log(`mount odata adapter for ${adapter.path}`)
        app.use(adapter.path, before, adapter, after)
    })

    app.useStaticAssets(__dirname + '/../app');

    await app.listen(port)

    console.log(`nest running at http://localhost:${port}`)
}

bootstrap({ adapters: [], middlewares: {} })
