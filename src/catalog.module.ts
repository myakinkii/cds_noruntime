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
        // also as we make one "magic loop", it sets this.ready = this.begin().then(()=>true)
    }

    @Post('*batch') // omg $batch just does not work ;(
    @UseInterceptors(HandleMultipartInterceptor, AddODataContextInterceptor)
    async handleBatch(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        await (this.dbService as Service).tx( async (tx) => {
            await tx.begin() // this is super important to call for now
            for (const r of req.batch.requests) {
                r.result = await tx.run(r.query)
                r.statusCode = 200
            }
            // if (Math.random() > 0.5) throw new Error('what about a rollback tho?')
        })
        return
    }

    @Post('submitOrder')
    async submitOrder(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        res.status(HttpStatus.CREATED)
        // cds.context.tx = undefined BECAUSE no TXing is done so far
        await (this.dbService as Service).tx( async (tx) => { // this is our db.tx()
            // here cds.context.tx = RootTransaction for DBWithAutoTX -> cds.context.tx == tx AND tx.context == cds.context
            await tx.begin() // this we need to trigger manually cuz we removed "magic loops" from run and dispatch
            const results = await tx.insert({name:'Emily Brontë'}).into('sap_capire_bookshop_Authors') // this will call tx.run
            await tx.insert({ title: 'Wuthering Heights', author: {ID: null} }).into('CatalogService.Books')
            if (Math.random() > 0.5) throw new Error('what about a rollback tho?')
        })
        // indeed, commit/rollbacl is handled automatically
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