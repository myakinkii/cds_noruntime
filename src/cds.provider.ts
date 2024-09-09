import { Service } from '@sap/cds'
export { Service } from '@sap/cds'
import { load_cds_model, create_odata_adapter } from '../srv/lib/cds_init'

const cds = require('@sap/cds')
const srv_tx = require('@sap/cds/lib/srv/srv-tx') // tx magic
const MySQLiteService = require('../srv/lib/MySQLiteService')
const FakeCDSService = require('../srv/lib/FakeCDSService')

export class CDSWithExternalTX extends FakeCDSService {
    tx(fn) {
        const expectedRootTransaction = srv_tx.call(this, fn)
        return expectedRootTransaction
    }
}

export class DBWithExternalTX extends MySQLiteService {
    tx(fn) {
        const expectedRootTransaction = srv_tx.call(this, fn)
        return expectedRootTransaction
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
        return new (DBWithExternalTX as Service)('db', cdsmodel, cds.requires.db) // hardcoded options for now
    },
    inject:['model']
}

@Module({
    providers: [dbProvider, cdsModelProvider],
    exports: ['db', 'model']
})
export class CDSModule { }
