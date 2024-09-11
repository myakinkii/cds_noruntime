const cds = require('@sap/cds')
const { getKeysAndParamsFromPath } = require('@sap/cds/libx/common/utils/path')

module.exports = adapter => {
    const { service } = adapter

    return function read(req, res, next) {

        if (req.method != 'GET') return next()

        // REVISIT: better solution for _propertyAccess
        let {
            SELECT: { from, one },
            target,
            _propertyAccess
        } = req._query
        const { _query: query } = req

        // payload & params
        const { keys, params } = getKeysAndParamsFromPath(from, service)
        const data = keys //> for read and delete, we provide keys in req.data

        // cdsReq.headers should contain merged headers of envelope and subreq
        const headers = { ...cds.context.http.req.headers, ...req.headers }

        // we need a cds.Request for multiple reasons, incl. params, headers, sap-messages, read after write, ...
        const cdsReq = new cds.Request({ query, data, params, headers, req, res })

        if (!query.SELECT.columns) query.SELECT.columns = ['*']

        req.query = query
        next()

        // NOTES:
        // - only via srv.run in combination with srv.dispatch inside,
        //   we automatically either use a single auto-managed tx for the req (i.e., insert and read after write in same tx)
        //   or the auto-managed tx opened for the respective atomicity group, if exists
        // - in the then block of .run(), the transaction is committed (i.e., before sending the response) if a single auto-managed tx is used
        // return service.run(() => { return service.dispatch(cdsReq).then(result => {}) }).then().catch()
    }
}