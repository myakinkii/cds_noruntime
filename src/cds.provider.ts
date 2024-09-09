import { Service } from '@sap/cds'
export { Service } from '@sap/cds'

import { load_cds_model, get_tx_for, get_db_opts, FakeCDSService, MySQLiteService } from '../srv/lib/cds_init'

export class CDSWithExternalTX extends FakeCDSService {

    dbService: any // injected later via onModuleInit

    tx(fn) {
        return get_tx_for(this, fn)
    }

    async handle(req){
        console.log("HANDLE", req.event, JSON.stringify(req.query))
        req.target = req.query.target // patch so that middleware etag shit works

         // call instance of our "db" service that we got from controller 
        return this.dbService.run(req.query, req.data)
    }
}

export class DBWithExternalTX extends MySQLiteService {
    tx(fn) {
        return get_tx_for(this, fn)
    }
}

import { Module, Injectable } from '@nestjs/common';

const cdsModelProvider = {
    provide: 'model',
    useFactory: async () => load_cds_model()
}

const dbProvider = {
    provide: 'db',
    useFactory: async (cdsmodel:any) => {
        return new (DBWithExternalTX as Service)('db', cdsmodel, get_db_opts()) // hardcoded options for now
    },
    inject:['model']
}

@Module({
    providers: [dbProvider, cdsModelProvider],
    exports: ['db', 'model']
})
export class CDSModule { }
