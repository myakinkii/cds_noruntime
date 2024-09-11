import { Service } from '@sap/cds'
export { Service } from '@sap/cds'

import { load_cds_model, get_tx_for, get_db_opts, FakeCDSService, MySQLiteService } from '../srv/lib/cds_init'
export { SELECT, INSERT, UPDATE, DELETE } from '../srv/lib/cds_init'
export { get_cds_middlewares_for, get_odata_middlewares_for } from '../srv/lib/cds_init'

export class EmptyCDSService {

    private name: string
    private options: any
    private model: any
    private definition: any

    constructor(name, model, o) {
        // we need them all set
        this.name = name
        this.options = o
        this.model = model
        this.definition = model.definitions[this.name]
    }
  
    get endpoints() {
        return [{ kind: this.options.to || "odata", path: this.options.at || "/odata/v4/" + this.name.toLowerCase() }]
    }
}

export class CDSWithExternalTX extends FakeCDSService {

    dbService: DBWithExternalTX // injected later via onModuleInit

    tx(fn) {
        return get_tx_for(this, fn)
    }

    async handle(req){
        console.log("HANDLE", req.event, JSON.stringify(req.query))
        req.target = req.query.target // patch so that middleware etag shit works

         // call instance of our "db" service that we got from controller 
        return (this.dbService as Service).run(req.query, req.data)
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
