const cds = require('@sap/cds')
const srv_tx = require('@sap/cds/lib/srv/srv-tx') // tx magic

const MySQLiteService = require('./MySQLiteService')
const FakeCDSService = require('./FakeCDSService')
const ODataAdapter = require('./ODataAdapter')

async function load_cds_model () {
    return cds.model ? cds.model : cds.load('*').then( (csn) => cds.model = cds.compile.for.nodejs(csn) )
}

function create_odata_adapter (srv) {
    const [{ kind, path}] = srv.endpoints // assume just one
    const adapter = new ODataAdapter(srv)
    adapter.path = path
    return adapter
}

async function cds_init () {
    return load_cds_model().then( model => { // if we are in gen/srv it will pick up prebuilt csn.json

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

        return [AdminService, CatalogService].map( impl => {

            //stolen from lib/srv/protocols/index.js
            const _slugified = name => /[^.]+$/.exec(name)[0].replace(/Service$/,'').replace(/_/g,'-').replace(/([a-z0-9])([A-Z])/g, (_,c,C) => c+'-'+C).toLowerCase()

            const srv = new impl(impl.name, model, { to:"odata-v4", at: "/odata/v4/"+_slugified(impl.name) })

            return create_odata_adapter(srv)
        })
        
    }).then( adapters => ({ adapters, middlewares: cds.middlewares }))
}

module.exports = {
    cds_init,
    load_cds_model,
    create_odata_adapter
}