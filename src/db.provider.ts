import { Service } from '@sap/cds'
import { load_cds_model, create_odata_adapter } from '../srv/lib/cds_init'

const cds = require('@sap/cds')
const srv_tx = require('@sap/cds/lib/srv/srv-tx') // tx magic
const MySQLiteService = require('../srv/lib/MySQLiteService')

class DBWithExternalTX extends MySQLiteService {
    tx(fn) {
        const expectedRootTransaction = srv_tx.call(this, fn)
        return expectedRootTransaction
    }
}

import { Module, Injectable } from '@nestjs/common';

const dbProvider = {
    provide: 'db',
    useFactory: async () => {
        const cdsmodel = await load_cds_model()
        return new (DBWithExternalTX as Service)('db', cdsmodel, cds.requires.db) // hardcoded options for now
    }
}

@Module({
    providers: [dbProvider],
    exports: ['db']
})
export class DBModule { }
