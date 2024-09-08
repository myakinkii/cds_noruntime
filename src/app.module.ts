import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Controller('rest/v1/srv/Books')
export class BooksController {
    @Get()
    get(@Res() res: Response) {
        res.status(HttpStatus.OK).json([]);
    }
    @Post()
    create(@Req() req: Request, @Res() res: Response) {
        res.status(HttpStatus.CREATED).send(req.body); // jsonBodyParser from express.json()
    }
}

function rootResponder(req: Request, res: Response, next: NextFunction) {
    res.status(HttpStatus.OK).send("ok");
};

@Module({
    controllers: [BooksController]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(rootResponder).forRoutes({ path: '/', method: RequestMethod.GET });
    }
}