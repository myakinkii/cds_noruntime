const cds = require('@sap/cds')
const { before, after } = cds.middlewares

const ODataAdapter = require('./ODataAdapter')

module.exports = function cds_serve(som, _options) {

    const services = som == "all" ? cds.model.services : [cds.model.services[som]]
    let implClassess = services.reduce((prev, cur) => Object.assign(prev, { [cur.name]: null }), {})

    const o = { ..._options } // this later is modified by our from/with/at/to

    return {
        from(model) {
            o.from = model;
            return this
        },
        with(impl) {
            if (Array.isArray(impl)) {
                impl.forEach(i => implClassess[i.name] = i)
            } else { // not to break .with api when it is only a single impl
                o.with = impl;
                implClassess[impl.name] = impl
            }
            return this
        },
        at(path) {
            o.at = path;
            return this
        },
        to(protocol) {
            o.to = protocol;
            return this
        },
        async in(app) {

            const instances = await Promise.all(services.map(async d => {
                // looks like srv.endpoints are somehow async so we need to await new impl.. weird
                const srv = new implClassess[d.name](d.name, cds.model, o)
                return srv._init()
            }))

            instances.forEach(srv => {
                for (let { kind, path } of srv.endpoints) {
                    // for now we will only focus on default v4 protocol
                    const adapter = new ODataAdapter(srv)
                    adapter.path = path
                    app.use(path, before, adapter, after) // ok there it is! our magic
                    cds.emit('serving', srv)
                }
            })
            return this
        }
    }
}