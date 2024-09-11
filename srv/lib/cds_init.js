const cds = require('@sap/cds')
const srv_tx = require('@sap/cds/lib/srv/srv-tx') // tx magic

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql

const MySQLiteService = require('./MySQLiteService')
const FakeCDSService = require('./FakeCDSService')
const { ODataAdapter, ODataAdapterMiddleware } = require('./ODataAdapter')

async function load_cds_model () {
    return cds.model ? cds.model : cds.load('*').then( (csn) => cds.model = cds.compile.for.nodejs(csn) )
}

function get_db_opts(){
    return cds.requires.db
}

function get_cds_middlewares(){
    return cds.middlewares
}

function get_odata_middlewares_for(service){
    const { before, after } = get_cds_middlewares()
    return [
        ...before,
        // we need cds.context as getKeysAndParamsFromPath crashes at const model = cds.context.model ?? srv.model
        ODataAdapterMiddleware._baseUrl({service}),
        ODataAdapterMiddleware._parse({service}),
        ODataAdapterMiddleware._read({service}),
        ODataAdapterMiddleware._create({service}),
    ]
}

function get_cds_middlewares_for(srv){
    const adapter = create_odata_adapter(srv)
    const { before, after } = get_cds_middlewares()
    return [before, adapter, after]
}

function create_odata_adapter (srv) {
    const [{ kind, path}] = srv.endpoints // assume just one
    const adapter = new ODataAdapter(srv)
    adapter.path = path
    return adapter
}

function get_tx_for(srv,fn){
    return srv_tx.call(srv, fn)
}

async function cds_init () {
    return load_cds_model().then( model => { // if we are in gen/srv it will pick up prebuilt csn.json

        class DBWithExternalTX extends MySQLiteService {

            tx(fn) {
                return get_tx_for(this, fn)
            }
        }

        const dbService = new DBWithExternalTX ("db", model, get_db_opts()); 

        class AdminService extends FakeCDSService {

            tx(fn) {
                return get_tx_for(this, fn)
            }

            async handle(req){
                console.log("HANDLE", req.event, JSON.stringify(req.query))
                req.target = req.query.target // patch so that middleware etag shit works
                return this.dbService.run(req.query, req.data) // call instance of our "db" service
            }
        }

        class CatalogService extends FakeCDSService {

            tx(fn) {
                return get_tx_for(this, fn)
            }

            async handle(req){
                console.log("HANDLE", req.event, JSON.stringify(req.query))
                req.target = req.query.target // patch so that middleware etag shit works
                return this.dbService.run(req.query, req.data) // call instance of our "db" service
            }
        }

        return [AdminService, CatalogService].map( impl => {

            //stolen from lib/srv/protocols/index.js
            const _slugified = name => /[^.]+$/.exec(name)[0].replace(/Service$/,'').replace(/_/g,'-').replace(/([a-z0-9])([A-Z])/g, (_,c,C) => c+'-'+C).toLowerCase()

            const srv = new impl(impl.name, model, { to:"odata-v4", at: "/odata/v4/"+_slugified(impl.name) })
            srv.dbService = dbService // inject cds db service

            return create_odata_adapter(srv)
        })
        
    }).then( adapters => ({ adapters, middlewares: get_cds_middlewares() }))
}

module.exports = {
    cds_init,
    load_cds_model,
    get_cds_middlewares,
    get_cds_middlewares_for,
    get_odata_middlewares_for,
    get_tx_for,
    get_db_opts,
    create_odata_adapter,
    MySQLiteService,
    FakeCDSService,
    SELECT, INSERT, UPDATE, DELETE
}