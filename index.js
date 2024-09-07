const cds = require("@sap/cds")
const express = require("express")

const ODataAdapter = require('./srv/lib/ODataAdapter')
const adminImpl = require("./srv/admin-service")
const catalogImpl = require("./srv/cat-service")
const dbImpl = require("./MySQLiteService")

cds.load('*').then( async (csn) => {

    // here goes cds services instantiation part

    cds.model = cds.compile.for.nodejs(csn)

    cds.db = cds.services.db = await new dbImpl ("db", cds.model, cds.requires.db); 
    await cds.db._init()

    return Promise.all([adminImpl, catalogImpl].map( async (impl) => {
        const srv = await new impl(impl.name, cds.model, {})
        await srv._init()

        cds.services[srv.name] = srv

        const adapters = []
        for (let { kind, path } of srv.endpoints) {
            const adapter = new ODataAdapter(srv)
            adapter.path = path
            adapters.push(adapter)
        }
        return adapters
    }))
}).then( adapters => {

    // here goes express part
    
    const app = express()
    const port = process.env.PORT || 4004

    const { before, after } = cds.middlewares

    adapters.forEach( ([adapter]) => {
        console.log(`mount odata adapter for ${adapter.path}`)
        app.use(adapter.path, before, adapter, after)
    })

    app.use(express.static(__dirname+'/../../app')) // to serve static stuff from app

    app.get('/', (req, res) => res.send("ok\n"))

    const server = app.listen(port)

    server.on("error", error => console.error(error.stack))

    console.log(`cds listening on port ${port}`)

})