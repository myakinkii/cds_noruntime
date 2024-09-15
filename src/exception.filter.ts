import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // WHEN our http adapter requires_check calls next(401)
    // THEN odata_error middleware calls next(err)
    // THEN we have exception == 401 here (just as status number )
    if (exception as any == 401) response.set('WWW-Authenticate', `Basic realm="Users"`).sendStatus(401) // send login
    else response.status(HttpStatus.BAD_REQUEST).json({ error: exception.message, path: request.url }) // just something
  }
}