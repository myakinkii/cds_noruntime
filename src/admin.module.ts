import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {ModuleRef} from '@nestjs/core'

import { CDSModule, CDSWithExternalTX, Service } from './cds.provider';

import { get_cds_middlewares, create_odata_adapter} from '../srv/lib/cds_init'
import { FakeCDSService } from '../srv/lib/FakeCDSService'

@Controller('rest/v1/admin')
export class AdminController {

    @Inject('db')
    dbService: any

    @Get('*')
    get(@Res() res: Response) {
        res.status(HttpStatus.OK).json([])
    }
    @Post('*')
    create(@Req() req: Request, @Res() res: Response) {
        res.status(HttpStatus.CREATED).send(req.body)
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

    private odataService: FakeCDSService

    constructor(private moduleRef: ModuleRef) {}

    onModuleInit() {
        this.odataService.dbService = this.moduleRef.get(AdminController).dbService
    }
    
    configure(consumer: MiddlewareConsumer) {
        const srv = this.odataService = new (CDSWithExternalTX as Service)(this.svcName, this.cdsmodel, { at: this.svcPath })
        const adapter = create_odata_adapter(srv)
        const { before, after } = get_cds_middlewares()
        console.log(`mount odata adapter for ${adapter.path}`)
        consumer.apply(before, adapter, after).forRoutes(adapter.path)
    }
}