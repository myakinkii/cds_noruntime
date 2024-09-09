import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {ModuleRef} from '@nestjs/core'

import { CDSModule, CDSWithExternalTX, DBWithExternalTX, Service, get_cds_middlewares_for } from './cds.provider'
import { SELECT, INSERT, UPDATE, DELETE } from './cds.provider'

@Controller('rest/v1/admin')
export class AdminController {

    @Inject('db')
    dbService: DBWithExternalTX

    @Get('*')
    get(@Req() req: Request, @Res() res: Response) {
        res.status(HttpStatus.OK).json([])
    }
    @Post('*')
    create(@Req() req: Request, @Res() res: Response) {
        req.query = INSERT.into`AdminService.Books`.entries(req.body)
        return (this.dbService as Service).run(req.query)
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