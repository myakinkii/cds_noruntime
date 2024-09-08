const cds = require('@sap/cds')
const srv_tx = require('@sap/cds/lib/srv/srv-tx') // tx magic

const MySQLiteService = require('./MySQLiteService')
const FakeCDSService = require('./FakeCDSService')
const ODataAdapter = require('./ODataAdapter')

module.exports = function cds_init () {
    return cds.load('*').then( async (csn) => { // if we are in gen/srv it will pick up prebuilt csn.json

        const model = cds.model = cds.compile.for.nodejs(csn) // this guy needs to be global so far..

        class DBWithExternalTX extends MySQLiteService {
            tx(fn) {
                const expectedRootTransaction = srv_tx.call(this, fn)
                return expectedRootTransaction
            }
        }

        const dbService = new DBWithExternalTX ("db", model, cds.requires.db); 

        class AdminService extends FakeCDSService {

            tx(fn) {
                const expectedRootTransaction = srv_tx.call(this, fn)
                return expectedRootTransaction
            }

            async handle(req){
                console.log("HANDLE", req.event, JSON.stringify(req.query))
                req.target = req.query.target // patch so that middleware etag shit works
                return dbService.run(req.query, req.data) // call instance of our "db" service
            }
        }

        class CatalogService extends FakeCDSService {

            tx(fn) {
                const expectedRootTransaction = srv_tx.call(this, fn)
                return expectedRootTransaction
            }

            async handle(req){
                console.log("HANDLE", req.event, JSON.stringify(req.query))
                req.target = req.query.target // patch so that middleware etag shit works
                return dbService.run(req.query, req.data) // call instance of our "db" service
            }
        }

        return Promise.all([AdminService, CatalogService].map( async (impl) => {

            //stolen from lib/srv/protocols/index.js
            const _slugified = name => /[^.]+$/.exec(name)[0].replace(/Service$/,'').replace(/_/g,'-').replace(/([a-z0-9])([A-Z])/g, (_,c,C) => c+'-'+C).toLowerCase()

            const srv = new impl(impl.name, model, { to:"odata-v4", at: "/odata/v4/"+_slugified(impl.name) })
            // await srv._init()

            const [{ kind, path}] = srv.endpoints // assume just one
            const adapter = new ODataAdapter(srv)
            adapter.path = path
            return adapter
        }))
        
    }).then( adapters => ({ adapters, middlewares: cds.middlewares }))
}