const cds = require("@sap/cds")
const express = require("express")

const MySQLiteService = require("./MySQLiteService")
const FakeCDSService = require('./srv/lib/FakeCDSService')
const ODataAdapter = require('./srv/lib/ODataAdapter')

cds.load('*').then( async (csn) => {

    // here goes cds part

    const model = cds.model = cds.compile.for.nodejs(csn) // this guy needs to be global so far..

    const dbService = new MySQLiteService ("db", model, cds.requires.db); 
    await dbService._init()

    class AdminService extends FakeCDSService {
        async handle(req){
            console.log("HANDLE", req.event, JSON.stringify(req.query))
            req.target = req.query.target // patch so that middleware etag shit works
            return dbService.run(req.query, req.data) // call instance of our "db" service
        }
    }

    class CatalogService extends FakeCDSService {
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

}).then( adapters => {

    // here goes express app init
    
    const app = express()
    const port = process.env.PORT || 4004

    const { before, after } = cds.middlewares

    adapters.forEach( (adapter) => {
        console.log(`mount odata adapter for ${adapter.path}`)
        app.use(adapter.path, before, adapter, after)
    })

    app.use(express.static(__dirname+'/../../app')) // to serve static stuff from app

    app.get('/', (req, res) => res.send("ok\n"))

    const server = app.listen(port)

    server.on("error", error => console.error(error.stack))

    console.log(`cds listening on port ${port}`)

})