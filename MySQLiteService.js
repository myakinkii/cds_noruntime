const SQLiteService = require('@cap-js/sqlite')

module.exports = class MySQLiteService extends SQLiteService {

    init() {
        return super.init(...arguments)
    }

    async run(req, data) {
        console.log("DB.RUN", typeof req)
        return super.run(req, data)
    }

    async dispatch(req) {
        console.log("DB.DISPATCH", req.event, JSON.stringify(req.query))
        return super.dispatch(req)
    }

    async handle(req) {
        console.log("DB.HANDLE", req.event, JSON.stringify(req.query))
        return super.handle(req)
    }
}