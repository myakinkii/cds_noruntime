const { Request } = require('@sap/cds')
const SQLiteService = require('@cap-js/sqlite')
const srv_tx = require('@sap/cds/lib/srv/srv-tx') // tx magic
const sqlFactory = require('@sap/cds/libx/_runtime/db/sql-builder/sqlFactory') // legacy cqn to sql

module.exports = class MySQLiteService extends SQLiteService {

    send(method, path, data, headers) {// stolen from srv-api, but we only receive BEGIN COMMIT ROLBACK here
        console.log("DB.SEND", method)
        return this.dispatch(new Request({ method, path, data, headers }))
    }

    async run(query, data) { // this signature is probably obsolete and comes from old times.. 
        console.log("DB.RUN", typeof query)
        const already_txed = !!this.ready // not sure but looks like this is what srv_tx deals with
        // how do we get this.ready if TX is NOT srv?!!
        // cuz TX has SRV prototype: const tx = { __proto__:srv, _kind: new.target.name, context: ctx }
        // therefore we get here with tx.run is called
        // ALSO after dispatch is replaced with _begin, next time we do tx.run BEGIN, it calls dispatch and that calls actual begin
        // and tx.ready becomes our tx.dbc BUT srv.dbc DOES NOT EXIST
        // BUT that means srv DOES NOT HAVE dbc/pool etc - YES, but somehow it GETS srv.pools (?!)
        if (typeof query === 'function') {
            const fn = query // for clarity
            return this.tx(fn) // here we get us tx-ed with RootTransaction
        } else if (already_txed){ // we want this for manual tx mode
            return this.dispatch(new Request({ query })) // so this guy just dispatches while handler has to call begin + commit/rollback
        } else {
            // this is some magic to acquire tx
            // resembles to what happens in odata middleware: run + dispatch
            return this.run(tx => tx.dispatch(new Request({ query }))) // probably just to make us "tx ourself" + call srv.dispatch
        }
    }

    async dispatch(req) { // ok it actually has to be cds.Request which replaces actual req object
        console.log("DB.DISPATCH", req.event, req.query?.target?.name)
        return this.handle(req)
    }

    async handle(req) { // so we basically just need req.query and req.event here
        console.log("DB.HANDLE", req.event, JSON.stringify(req.query))

        if (req.event in { 'BEGIN': 1, 'COMMIT': 1, 'ROLLBACK': 1 }) return this.exec(req.event)

        const { query, data } = req // but looks like even without data it generaters proper sql based on query
        const { sql, values, entries, cqn } = this.cqn2sql(query) // lots of magic here
        // also renders and console logs sql at this moment

        // const {sql, values } = sqlFactory(query, null, this.model) // does not fully support new cqn parser
        // has issues with expands and resolving names of actual tables

        const ps = await this.prepare(sql)
        let results
        if (req.event == 'READ') {
            results = await ps.all(values)
        } else if (req.event == 'DELETE' || req.event == 'UPDATE') {
            results = await ps.run(values)
        } else {
            results = entries ? await Promise.all(entries.map(v => ps.run(v))) : await ps.run()
        }
        return results
    }

    tx(fn) {
        return srv_tx.call(this, fn) // we assume that we actually just "tx" ourself.. but it is more complex it seems
    }
}