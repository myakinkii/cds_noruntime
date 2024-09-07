const cds = require("@sap/cds")
const express = require("express")
const app = express()
const port = process.env.PORT || 4004

const cds_serve = require('./srv/lib/cds_serve')

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