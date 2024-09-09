import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Delete, Req, Res, HttpStatus } from '@nestjs/common';
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
    getBooks(@Req() req: Request, @Res() res: Response) {
        res.status(HttpStatus.OK).json([])
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