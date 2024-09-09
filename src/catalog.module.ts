import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Controller('rest/v1/catalog')
export class CatalogController {

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

class CatalogService extends FakeCDSService {

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
    controllers: [CatalogController],
    imports: [DBModule]
})
export class CatalogModulde implements NestModule, OnModuleInit {

    private odataService: CatalogService

    constructor(private moduleRef: ModuleRef) {}

    onModuleInit() {
        this.odataService.dbService = this.moduleRef.get(CatalogController).dbService
    }
    
    async configure(consumer: MiddlewareConsumer) {
        return load_cds_model().then(cdsmodel => {
            this.odataService = new (CatalogService as Service)('CatalogService', cdsmodel, { at: '/odata/v4/catalog' })
            return this.odataService
        }).then(create_odata_adapter).then( adapter => {
            const { before, after } = cds.middlewares
            console.log(`mount odata adapter for ${adapter.path}`)
            consumer.apply(before, adapter, after).forRoutes(adapter.path)
            // consumer.apply(before, adapter, after).forRoutes(CatalogController) // could be later
        })
    }
}