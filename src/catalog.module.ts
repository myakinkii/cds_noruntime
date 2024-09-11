import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {ModuleRef} from '@nestjs/core'

import { CDSModule, EmptyCDSService, DBWithExternalTX, Service, get_odata_middlewares_for } from './cds.provider'
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
        return (this.dbService as Service).run(req.query)
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