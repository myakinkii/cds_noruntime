const cds = require('@sap/cds')
const { getKeysAndParamsFromPath } = require('@sap/cds/libx/common/utils/path')
const { INSERT } = cds.ql

module.exports = (adapter, isUpsert) => {
    const { service } = adapter

    return function create(req, res, next) {
        
        if (req.method != 'POST') return next()

        const {
            SELECT: { one, from },
            target
        } = req._query

        // payload & params
        const data = req.body
        const { keys, params } = getKeysAndParamsFromPath(from, service)
        // add keys from url into payload (overwriting if already present)
        Object.assign(data, keys)

        const _isDraft = target.drafts && data.IsActiveEntity !== true

        // query
        const query = INSERT.into(from).entries(data)

        // cdsReq.headers should contain merged headers of envelope and subreq
        const headers = { ...cds.context.http.req.headers, ...req.headers }

        // we need a cds.Request for multiple reasons, incl. params, headers, sap-messages, read after write, ...
        const cdsReq = new cds.Request({ query, data, params, headers, req, res })

        // rewrite event for draft-enabled entities
        if (_isDraft) cdsReq.event = 'NEW'

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
