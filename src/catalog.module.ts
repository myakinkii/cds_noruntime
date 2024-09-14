import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject, UseInterceptors } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ModuleRef } from '@nestjs/core'

import { AddODataContextInterceptor, HandleMultipartInterceptor } from './transform.interceptor';

import { CDSModule, EmptyCDSService, DBWithAutoTX, Service, get_odata_middlewares_for } from './cds.provider'
import { SELECT, INSERT, UPDATE, DELETE } from './cds.provider'

const svcPath = '/rest/v1/catalog'

@Controller(svcPath)
export class CatalogService {

    @Inject('db')
    dbService: DBWithAutoTX

    @Get('*')
    @UseInterceptors(AddODataContextInterceptor)
    async getBooks(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        res.status(HttpStatus.OK)
        res.set('X-Custom', 'served with nest-ed cds odata')
        if (!req.query.SELECT) return // HEAD service request gets here..
        return (this.dbService as Service).run(req.query) // this stuff will be auto tx-ed
    }

    @Post('*batch') // omg $batch just does not work ;(
    @UseInterceptors(HandleMultipartInterceptor, AddODataContextInterceptor)
    async handleBatch(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        const tx = (this.dbService as Service).tx() // believe it or not, its our db service, but "tx-ed" now...
        try {
            await tx.begin()
            for (const r of req.batch.requests) {
                r.result = await tx.run(r.query)
                r.statusCode = 200
            }
            // throw new Error('Batch failed') // to see where we get
            res.status(HttpStatus.OK)
            await tx.commit()
        } catch (e) {
            res.status(HttpStatus.BAD_REQUEST)
            await tx.rollback()
        }
        return
    }

    @Post('submitOrder')
    async submitOrder(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        res.status(HttpStatus.CREATED)
        // return (this.dbService as Service).run(req.query)
        return (req as any).data
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
        const srv = new EmptyCDSService(CatalogService.name, this.cdsmodel, { at: [svcPath] })
        console.log(`apply odata middlewares for ${svcPath}`)
        consumer.apply(...get_odata_middlewares_for(srv)).forRoutes(CatalogService)
    }
}