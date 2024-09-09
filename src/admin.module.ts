import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

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

import { Service } from '@sap/cds'
import { load_cds_model, create_odata_adapter} from '../srv/lib/cds_init'
import { DBModule } from './db.provider';

const cds = require('@sap/cds')
const srv_tx = require('@sap/cds/lib/srv/srv-tx') // tx magic
const FakeCDSService = require('../srv/lib/FakeCDSService')

class AdminService extends FakeCDSService {

    tx(fn) {
        const expectedRootTransaction = srv_tx.call(this, fn)
        return expectedRootTransaction
    }

    async handle(req){
        console.log("HANDLE", req.event, JSON.stringify(req.query))
        req.target = req.query.target // patch so that middleware etag shit works
        return this.dbService.run(req.query, req.data) // call instance of our "db" service
    }
}

import {ModuleRef} from '@nestjs/core'

@Module({
    controllers: [AdminController],
    imports: [DBModule]
})
export class AdminModule implements NestModule, OnModuleInit {

    private odataService: AdminService

    constructor(private moduleRef: ModuleRef) {}

    onModuleInit() {
        this.odataService.dbService = this.moduleRef.get(AdminController).dbService
    }
    
    async configure(consumer: MiddlewareConsumer) {
        return load_cds_model().then(cdsmodel => {
            this.odataService = new (AdminService as Service)('AdminService', cdsmodel, { at: '/odata/v4/admin' })
            return this.odataService
        }).then(create_odata_adapter).then( adapter => {
            const { before, after } = cds.middlewares
            console.log(`mount odata adapter for ${adapter.path}`)
            consumer.apply(before, adapter, after).forRoutes(adapter.path)
            // consumer.apply(before, adapter, after).forRoutes(AdminController) // could be later
        })
    }
}