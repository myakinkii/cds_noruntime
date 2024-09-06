const cds = require("@sap/cds")
const express = require("express")
const app = express()
const port = process.env.PORT || 4004


const jsonBodyParser = express.json()
const BaseProtocolAdapter = require('@sap/cds/lib/srv/protocols/http')
const { isStream, stream } = require('@sap/cds/libx/odata/middleware/stream')

const ODataAdapterMiddleware = {
    sericeDocument : require('@sap/cds/libx/odata/middleware/service-document'),
    metadata : require('@sap/cds/libx/odata/middleware/metadata'),
    parse: require('@sap/cds/libx/odata/middleware/parse'), // cds.odata.parse wtf???
    batch: require('@sap/cds/libx/odata/middleware/batch'),
    operation: require('@sap/cds/libx/odata/middleware/operation'), // functions + actions
    create: require('@sap/cds/libx/odata/middleware/create'),
    read: require('@sap/cds/libx/odata/middleware/read'),
    update :require('@sap/cds/libx/odata/middleware/update'), // put + patch
    delete: require('@sap/cds/libx/odata/middleware/delete'),
    error: require('@sap/cds/libx/odata/middleware/error'),
    odata_streams: function (req, res, next) { // this is going to have more fun in cds8..
        // REVISIT: body of batch subrequests are already deserialized
        if (typeof req.body === 'object') return next()
        if (req.method === 'PUT' && isStream(req._query)) {
            req.body = { value: req }
            return next()
        }
        // TODO: check if the raw body still exists, then we can remove deepCopy() in the handlers
        return jsonBodyParser(req, res, next)
    }
}

class ODataAdapter extends BaseProtocolAdapter {
  log(req) {
    // simplest ever
    console.log(req.method, req.baseUrl, req.url)
  }
  
  router4(srv) {
    const router = super.router4(srv)
    return router.use(/^\/$/, ODataAdapterMiddleware.sericeDocument(srv))
        .use('/\\$metadata', ODataAdapterMiddleware.metadata(srv))
        .use(ODataAdapterMiddleware.parse(srv))
        .use(ODataAdapterMiddleware.odata_streams)
        .post('/\\$batch', ODataAdapterMiddleware.batch(srv, router))
        .head('*', (_, res) => res.sendStatus(405))
        .post('*', ODataAdapterMiddleware.operation(srv)) //> action
        .get('*', ODataAdapterMiddleware.operation(srv)) //> function
        .post('*', ODataAdapterMiddleware.create(srv))
        .get('*', stream(srv))
        .get('*', ODataAdapterMiddleware.read(srv))
        .put('*', ODataAdapterMiddleware.update(srv, router))
        .patch('*', ODataAdapterMiddleware.update(srv, router))
        .delete('*', ODataAdapterMiddleware.delete(srv))
        .use(ODataAdapterMiddleware.error(srv))
  }
}

function cds_serve (som, _options){
        
    const services = som == "all" ? cds.model.services : [cds.model.services[som]]
    let implClassess = services.reduce( (prev,cur) => Object.assign(prev, { [cur.name]: null }), {})

    const o = {..._options} // this later is modified by our from/with/at/to

    return {
        from (model) {
            o.from = model;
            return this
        },
        with (impl) {
            if (Array.isArray(impl)) {
                impl.forEach( i => implClassess[i.name] = i)
            } else { // not to break .with api when it is only a single impl
                o.with = impl;
                implClassess[impl.name] = impl
            }
            return this
        },
        at (path) {
            o.at   = path;
            return this
        },
        to (protocol) {
            o.to   = protocol;
            return this
        },
        async in (app) {

            const instances = await Promise.all (services.map( async d => {
                // looks like srv.endpoints are somehow async so we need to await new impl.. weird
                const srv = new implClassess[d.name](d.name, cds.model, o)
                return srv._init()
            }))

            // for now we will only focus on default v4 protocol
            const { before, after } = cds.middlewares

            instances.forEach (srv => {
                for (let { kind, path } of srv.endpoints) {
                    const adapter = new ODataAdapter(srv)
                    adapter.path = path
                    app.use(path, before, adapter, after) // ok there it is! our magic
                    cds.emit ('serving', srv)
                }
            })
            return this
        }
    }
}

cds.connect("db").then(async function(somehowThisIsCdsNow){

    // const csn = await cds.load('*').then(cds.minify) // cuz why not to load it again
    const csn = cds.minify(somehowThisIsCdsNow.services.db.model) // dunno why minify though
    cds.model = cds.compile.for.nodejs(csn)

    cds.on('bootstrap', (app)=>{
        // not gonna happen
    })

    if (cds.env.requires.messaging)
        await cds.connect.to('messaging') // to init messaging

    cds.on('serving', (service) => {
        const { Books, Authors } = service.entities
    })

    // await cds.serve("all").in(app) // to serve all services as it was implemented in cds

    const adminImpl = require("./srv/admin-service")
    const catalogImpl = require("./srv/cat-service")
    // await cds_serve("AdminService").with(adminImpl).in(app)
    // await cds_serve("CatalogService").with(catalogImpl).at("/some-endpoint").to("odata-v4").in(app)
    await cds_serve("all").with([adminImpl, catalogImpl]).in(app) // to serve all services with impl classess

    cds.on('served', (services)=>{
        const { CatalogService, AdminService, db } = services
    })

    await cds.emit ('served', cds.services) // all services served now

    app.use(express.static(__dirname+'/../../app')) // to serve static app 
    app.get('/', (req, res) => res.send("ok\n"))
    const server = app.listen(port)
    server.on("error", error => console.error(error.stack))

    // file-based messaging will start watching the ~/.cds-msg-box now
    await cds.emit ('listening', {server})

    console.log(`running with profiles ${cds.env.profiles}`)
    console.log(`cds listening on port ${port}`)
    console.log(`app router stack:\n ${app._router.stack.map( s => {
        if (s.name == 'router') return s.handle.stack.map(h => s.name + ' > ' + s.handle.path + ' > ' + h.name ).join("\n")
        return s.name + ' > ' + (s.path||s.regexp)
    }).join("\n")}`)
})