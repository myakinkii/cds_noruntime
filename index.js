const express = require("express")

async function bootstrap({adapters, middlewares}) {
 
    const app = express()
    const port = process.env.PORT || 4004

    const { before, after } = middlewares

    adapters.forEach( (adapter) => {
        console.log(`mount odata adapter for ${adapter.path}`)
        app.use(adapter.path, before, adapter, after)
    })

    app.use(express.static(__dirname+'/app')) // to serve static stuff from app

    app.get('/', (req, res) => res.send("ok\n"))

    const server = app.listen(port)

    server.on("error", error => console.error(error.stack))

    console.log(`cds running at http://localhost:${port}`)
  }

  require('./srv/lib/cds_init').cds_init().then(bootstrap)