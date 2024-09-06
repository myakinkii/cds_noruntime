const cds = require("@sap/cds")
const express = require("express")
const app = express()
const port = process.env.PORT || 4004

cds.connect("db").then(async function(db){

    // load and prepare models (we need more global vars!)
    const csn = await cds.load('*').then(cds.minify)
    // why we need this?
    cds.edmxs = cds.compile.to.edmx.files(csn)
    // this is used at least in metadata handler
    cds.model = cds.compile.for.nodejs(csn) // but srv.definition === csnService -> true

    cds.on('bootstrap', (app)=>{
        // not gonna happen
    })

    if (cds.env.requires.messaging)
        await cds.connect.to('messaging') // to init messaging

    cds.on('serving', (service) => {
        const { Books, Authors } = service.entities
    })

    await cds.serve("all").in(app) // to serve all services

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