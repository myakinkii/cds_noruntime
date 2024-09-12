import { Service } from '@sap/cds'
export { Service } from '@sap/cds'

import { load_cds_model, get_db_opts, FakeCDSService, MySQLiteService, Request as CDSRequest } from '../srv/lib/cds_init'
export { SELECT, INSERT, UPDATE, DELETE } from '../srv/lib/cds_init'
export { get_cds_middlewares_for, get_odata_middlewares_for, write_batch_multipart } from '../srv/lib/cds_init'

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

export class CDSServiceWithTX extends FakeCDSService {

    dbService: DBWithAutoTX // injected later via onModuleInit

}

export class DBWithAutoTX extends MySQLiteService {}

export class DBWWithManualTX extends MySQLiteService {

    async run(query) {
        console.log("DB.RUN", typeof query)
        const req = new CDSRequest({ query })
        return (this as Service).dispatch(req)
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
        return new (DBWWithManualTX as Service)('db', cdsmodel, get_db_opts()) // hardcoded options for now
    },
    inject:['model']
}

@Module({
    providers: [dbProvider, cdsModelProvider],
    exports: ['db', 'model']
})
export class CDSModule { }
