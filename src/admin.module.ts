import { Module, NestModule, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Post, Delete, Req, Res, Param, HttpStatus } from '@nestjs/common';
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ModuleRef } from '@nestjs/core'

import { CDSModule, CDSServiceWithTX, DBWithAutoTX, Service, get_cds_middlewares_for, get_odata_middlewares_for } from './cds.provider'
import { SELECT, INSERT, UPDATE, DELETE } from './cds.provider'

const svcPath = '/rest/v1/admin'

@Controller(svcPath)
export class AdminService {

    @Inject('db')
    dbService: DBWithAutoTX

    @Get('*/:id')
    async getBook(@Param() params: any, @Req() req: Request, @Res() res: Response) {
        // req.query = SELECT.one.from`CatalogService.Books`.where`ID = ${params.id}` // now its same as from middleware
        const result = await (this.dbService as Service).run(req.query)
        res.status(HttpStatus.OK).json(result)
    }

    @Post('*')
    async createBook(@Req() req: Request, @Res() res: Response) {
        req.query = INSERT.into`AdminService.Books`.entries(req.body)
        const result = await (this.dbService as Service).run(req.query)
        res.status(HttpStatus.CREATED).json(result)
    }

    @Delete('*')
    async deleteBook(@Req() req: Request, @Res() res: Response) {
        const tx = (this.dbService as Service).tx() // believe it or not, its our db service, but "tx-ed" now...
        try {
            await tx.begin()
            await tx.run(DELETE.from`AdminService.Books`.where({ ID: req.body.id }))
            if (Math.random() > 0.5) throw new Error('what about a rollback tho?')
            res.status(HttpStatus.NO_CONTENT)
            await tx.commit()
        } catch (e) {
            console.log(e.message)
            res.status(HttpStatus.BAD_REQUEST)
            await tx.rollback()
        }
        res.send()

    }
}

@Module({
    controllers: [AdminService],
    imports: [CDSModule]
})
export class AdminModule implements NestModule, OnModuleInit {

    @Inject('model')
    cdsmodel: any

    private odataService: CDSServiceWithTX

    constructor(private moduleRef: ModuleRef) { }

    onModuleInit() {
        this.odataService.dbService = this.moduleRef.get(AdminService).dbService
    }

    configure(consumer: MiddlewareConsumer) {

        const odataPath = '/odata/v4/admin'
        const srv = this.odataService = new (CDSServiceWithTX as Service)(AdminService.name, this.cdsmodel, { at: [odataPath, svcPath] })

        console.log(`mount odata adapter for ${odataPath}`) // this will actually handle all stuff within srv
        consumer.apply(...get_cds_middlewares_for(srv)).forRoutes(odataPath)

        console.log(`apply odata middlewares for ${svcPath}`) // this will just parse stuff for us
        consumer.apply(...get_odata_middlewares_for(srv)).forRoutes(AdminService)
    }
}