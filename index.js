const cds = require("@sap/cds")
const express = require("express")
const app = express()
const port = process.env.PORT || 4004

cds.connect("db").then(async function(db){

    // some stuff from your custom server.js
    cds.on('bootstrap', (app)=>{
        // not gonna happen
    })
    
    cds.on('serving', (service) => {
        const { Books } = service.entities
    })

    cds.on('served', (services)=>{
        const { CatalogService, db } = services
    })

    // await cds.connect.to('messaging') // to init messaging
    await cds.serve("all").in(app) // to serve all services
    await cds.emit ('served', cds.services) // amag_common_messaging will register emit handlers now

    app.use(express.static(__dirname+'/../../app')) // to serve static app 
    app.get('/', (req, res) => res.send("ok\n"))
    const server = app.listen(port)
    server.on("error", error => console.error(error.stack))

    // file-based messaging will start watching the ~/.cds-msg-box now
    await cds.emit ('listening', {server})

    console.log(`running with profiles ${cds.env.profiles}`)
    console.log(`cds listening on port ${port}`)
})