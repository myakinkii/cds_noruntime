import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { parseRequestMultipart, setMultipartResponse, transformResultObject } from './cds.provider'

@Injectable()
export class AddODataContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(map(result => this.trasformResponse(context, result)))
    }

    trasformResponse (context: ExecutionContext, result: any) {
        const ctx = context.switchToHttp()
        const req = ctx.getRequest()
        if (!req.batch) return transformResultObject(req, result)
        req.batch.requests.forEach( r => r.result = transformResultObject(r, r.result) )
        return
    }
}

@Injectable()
export class HandleMultipartInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // await this.handleRequest(context) // we need parse middleware to already have req.batch
        return next.handle().pipe(map(result => this.handleResponse(context, result)))
    }

    // for now we leave this part to middleware as it requires our cds service definition
    async handleRequest(context: ExecutionContext) {
        const ctx = context.switchToHttp()
        const req = ctx.getRequest()
        try {
            const batch = await parseRequestMultipart(req)
            req.batch = batch // will have req.batch.requests and req.batch.boundary
        } catch (e) {
            console.log(e)
            // do nothing
        }
    }

    handleResponse(context: ExecutionContext, result: any) {
        const ctx = context.switchToHttp()
        const req = ctx.getRequest()
        const res = ctx.getResponse()
        res.set('X-Batch', `requests=${req.batch.requests.length};boundary=${req.batch.boundary}`)
        if (res.statusCode != 400) setMultipartResponse(req, res)
        return
    }
}

