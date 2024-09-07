const cds = require('@sap/cds')
const { Event, Request } = cds
const srv_tx = require('@sap/cds/lib/srv/srv-tx')
const SQLiteService = require('@cap-js/sqlite')

module.exports = class MySQLiteService extends SQLiteService {

    send(method, path, data, headers) {// stolen from srv-api, but we only receive BEGIN COMMIT ROLBACK here
        console.log("DB.SEND", method)
        const is_object = (x) => typeof x === 'object'
        if (method instanceof Request) return this.dispatch(method)
        if (is_object(method)) return this.dispatch(new Request(method))
        if (is_object(path)) return this.dispatch(new Request({ method, data: path, headers: data }))
        return this.dispatch(new Request({ method, path, data, headers }))
    }

    tx(fn) {
        const expectedRootTransaction = srv_tx.call(this, fn)
        return expectedRootTransaction
    }

    async run(query, data) {
        console.log("DB.RUN", typeof query)
        if (typeof query === 'function') {
            const fn = query;
            return this.tx(fn) // here we get us root transaction
        } else {
            // this is some magic to acquire tx
            // resembles to what happens in odata middleware: run + dispatch
            const req = new Request({ query, data })
            return this.run(tx => tx.dispatch(req))
        }
    }

    async dispatch(req) {
        console.log("DB.DISPATCH", req.event, JSON.stringify(req.query))
        return this.handle(req)
    }

    async handle(req) {
        console.log("DB.HANDLE", req.event, JSON.stringify(req.query))

        if (req.event in { 'BEGIN': 1, 'COMMIT': 1, 'ROLLBACK': 1 }) return this.exec(req.event)

        const { query, data } = req
        const { sql, values, entries, cqn } = this.cqn2sql(query, data) // lots of magic here
        // also renders and console logs sql at this moment

        const ps = await this.prepare(sql)
        let results
        if (req.event == 'READ') {
            results = await ps.all(values)
        } else if (req.event == 'DELETE') {
            results = await ps.run(values)
        } else {
            results = entries ? await Promise.all(entries.map(v => ps.run(v))) : await ps.run()
        }
        return results
    }
}