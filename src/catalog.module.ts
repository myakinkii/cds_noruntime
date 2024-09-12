import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {ModuleRef} from '@nestjs/core'

import { CDSModule, EmptyCDSService, DBWithAutoTX, Service, get_odata_middlewares_for, write_batch_multipart } from './cds.provider'
import { SELECT, INSERT, UPDATE, DELETE } from './cds.provider'

const svcPath = '/rest/v1/catalog'

@Controller(svcPath)
export class CatalogService {

    @Inject('db')
    dbService: DBWithAutoTX

    @Get('*')
    async getBooks(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        res.status(HttpStatus.OK)
        res.set('X-Custom', 'served with nest-ed cds odata')
        if (!req.query.SELECT) return // HEAD service request gets here..
        return (this.dbService as Service).run(req.query) // this stuff will be auto tx-ed
    }

    @Post('*batch') // omg $batch just does not work ;(
    async handleBatch(@Req() req: any, @Res() res: Response) {
        res.set('X-Custom', 'something really nasty happens here')
        res.set('X-Batch', `requests=${req.batch.requests.length};boundary=${req.batch.boundary}`)
        res.status(HttpStatus.OK)
        const tx = (this.dbService as Service).tx() // believe it or not, its our db service, but "tx-ed" now...
        try {
            await tx.begin()
            for (const r of req.batch.requests ){
                r.result = await tx.run(r.query)
                r.statusCode = 200
            }
            // throw new Error('Batch failed')
            write_batch_multipart(req, res)
            await tx.commit()
        } catch (e){
            res.status(HttpStatus.BAD_REQUEST)
            await tx.rollback()
        }
        res.send()
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
        console.log(`apply odata middlewares for ${svcPath}`)
        consumer.apply(...get_odata_middlewares_for(srv)).forRoutes(CatalogService)
    }
}