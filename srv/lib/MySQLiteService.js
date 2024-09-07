const cds = require('@sap/cds')
const { Event, Request } = cds
const SQLiteService = require('@cap-js/sqlite')

module.exports = class MySQLiteService extends SQLiteService {

    init() {
        return super.init(...arguments)
    }

    async run(query, data) {
        console.log("DB.RUN", typeof req)
        if (typeof query === 'function') {
            const fn = query;
            return this.tx(fn) // here this guy does some magic with srv_tx
        } else { 
            // this is some magic to acquire tx
            // resembles to what happens in odata middleware: run + dispatch
            const req = new Request({ query, data })
            return this.run (tx => tx.dispatch(req))
        }
    }

    async dispatch(req) {
        console.log("DB.DISPATCH", req.event, JSON.stringify(req.query))
        return this.handle(req)
    }

    async handle(req) {
        console.log("DB.HANDLE", req.event, JSON.stringify(req.query))
        return super.handle(req)
    }
}