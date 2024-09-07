const cds = require("@sap/cds")
const express = require("express")

const ODataAdapter = require('./srv/lib/ODataAdapter')
const adminImpl = require("./srv/admin-service")
const catalogImpl = require("./srv/cat-service")
const dbImpl = require("./MySQLiteService")

cds.load('*').then( async (csn) => {

    // here goes cds.model and db service init

    cds.model = cds.compile.for.nodejs(csn)

    cds.db = cds.services.db = await new dbImpl ("db", cds.model, cds.requires.db); 
    await cds.db._init()

}).then( () => {

    // here goes app services init

    return Promise.all([adminImpl, catalogImpl].map( async (impl) => {

        //stolen from lib/srv/protocols/index.js
        const _slugified = name => /[^.]+$/.exec(name)[0].replace(/Service$/,'').replace(/_/g,'-').replace(/([a-z0-9])([A-Z])/g, (_,c,C) => c+'-'+C).toLowerCase()

        const srv = cds.services[impl.name] = new impl(impl.name, cds.model, { to:"odata-v4", at: "/odata/v4/"+_slugified(impl.name) })
        await srv._init()

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