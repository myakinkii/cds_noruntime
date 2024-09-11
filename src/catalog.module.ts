import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {ModuleRef} from '@nestjs/core'

import { CDSModule, EmptyCDSService, DBWithExternalTX, Service, get_odata_middlewares_for, write_batch_multipart } from './cds.provider'
import { SELECT, INSERT, UPDATE, DELETE } from './cds.provider'

const svcPath = '/rest/v1/catalog'

@Controller(svcPath)
export class CatalogService {

    @Inject('db')
    dbService: DBWithExternalTX

    @Get('*')
    async getBooks(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        res.status(HttpStatus.OK)
        res.set('X-Custom', 'served with nest-ed cds odata')
        if (!req.query.SELECT) return // HEAD service request gets here..
        return (this.dbService as Service).run(req.query)
    }

    @Post('*batch') // omg $batch just does not work ;(
    async handleBatch(@Req() req: any, @Res() res: Response) {
        res.set('X-Custom', 'something really nasty happens here')
        res.set('X-Batch', `requests=${req.batch.requests.length};boundary=${req.batch.boundary}`)
        res.status(HttpStatus.OK)
        for (const r of req.batch.requests ){
            r.result = await (this.dbService as Service).run(r.query, r.data)
            r.statusCode = 200
        }
        write_batch_multipart(req, res)
        res.send()
        // return Promise.all(req.batch.requests.map( r => (this.dbService as Service).run(r.query, r.data)))
    }

    @Post('*')
    async createBook(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        res.status(HttpStatus.CREATED)
        return (this.dbService as Service).run(req.query)
    }
}

@Module({
    controllers: [CatalogService],
    imports: [CDSModule]
})
export class CatalogModule implements NestModule {

    @Inject('model')
    cdsmodel: any

    configure(consumer: MiddlewareConsumer) {
        const srv = new EmptyCDSService(CatalogService.name, this.cdsmodel, { at: svcPath })
        console.log(`mount odata adapter for ${svcPath}`)
        consumer.apply(...get_odata_middlewares_for(srv)).forRoutes(CatalogService)
    }
}