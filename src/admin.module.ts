import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Delete, Req, Res, Param, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {ModuleRef} from '@nestjs/core'

import { CDSModule, CDSWithExternalTX, DBWithExternalTX, Service, get_cds_middlewares_for } from './cds.provider'
import { SELECT, INSERT, UPDATE, DELETE } from './cds.provider'

@Controller('rest/v1/admin')
export class AdminController {

    @Inject('db')
    dbService: DBWithExternalTX

    @Get('*/:id')
    async getBook(@Param() params: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
        req.query = SELECT.one.from`CatalogService.Books`.where`ID = ${params.id}`
        const result = await (this.dbService as Service).run(req.query)
        res.status(HttpStatus.OK)
        res.set('X-Custom', 'served with nest')
        return result
    }

    @Post('*')
    async createBook(@Req() req: Request, @Res() res: Response) {
        req.query = INSERT.into`AdminService.Books`.entries(req.body)
        const result = await (this.dbService as Service).run(req.query)
        res.status(HttpStatus.CREATED).json(result)
    }
    
    @Delete('*')
    async deleteBook(@Req() req: Request, @Res() res: Response) {
        req.query = DELETE.from`AdminService.Books`.where({ID: req.body.id})
        const result = await (this.dbService as Service).run(req.query)
        throw new Error('what about a rollback tho?')
        res.status(HttpStatus.NO_CONTENT).send()
    }
}

@Module({
    controllers: [AdminController],
    imports: [CDSModule]
})
export class AdminModule implements NestModule, OnModuleInit {

    @Inject('model')
    cdsmodel: any

    svcName = 'AdminService'
    svcPath = '/odata/v4/admin'

    private odataService: CDSWithExternalTX

    constructor(private moduleRef: ModuleRef) {}

    onModuleInit() {
        this.odataService.dbService = this.moduleRef.get(AdminController).dbService
    }
    
    configure(consumer: MiddlewareConsumer) {
        const srv = this.odataService = new (CDSWithExternalTX as Service)(this.svcName, this.cdsmodel, { at: this.svcPath })
        console.log(`mount odata adapter for ${this.svcPath}`)
        consumer.apply(...get_cds_middlewares_for(srv)).forRoutes(this.svcPath)
    }
}