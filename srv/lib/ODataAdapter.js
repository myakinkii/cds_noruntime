const cds = require('@sap/cds')
const express = require('express')

const jsonBodyParser = express.json()
const HttpAdapter = require('@sap/cds/lib/srv/protocols/http')
const { isStream } = require('@sap/cds/libx/odata/middleware/stream')

const ODataAdapterMiddleware = {
    odata_version: function (req, res, next) {
        res.set('OData-Version', '4.0')
        next()
    },
    sericeDocument: require('@sap/cds/libx/odata/middleware/service-document'),
    metadata: require('@sap/cds/libx/odata/middleware/metadata'),
    parse: require('@sap/cds/libx/odata/middleware/parse'), // cds.odata.parse added globally in cds.lib
    batch: require('@sap/cds/libx/odata/middleware/batch'),
    operation: require('@sap/cds/libx/odata/middleware/operation'), // functions + actions
    create: require('@sap/cds/libx/odata/middleware/create'),
    read: require('@sap/cds/libx/odata/middleware/read'),
    update: require('@sap/cds/libx/odata/middleware/update'), // put + patch
    delete: require('@sap/cds/libx/odata/middleware/delete'),
    error: require('@sap/cds/libx/odata/middleware/error'),
    stream: require('@sap/cds/libx/odata/middleware/stream'),
    odata_streams(req, res, next) {
        if (req.method === 'PUT' && isStream(req._query)) {
            req.body = { value: req }
            return next()
        }
        if (req.method === 'POST' && req.headers['content-type']?.match(/multipart\/mixed/)) {
            return next()
        }
        if (req.method in { POST: 1, PUT: 1, PATCH: 1 } && req.headers['content-type']) {
            const parts = req.headers['content-type'].split(';')
            // header ending with semicolon is not allowed
            if (!parts[0].match(/^application\/json$/) || parts[1] === '') {
                throw cds.error('415', { statusCode: 415, code: '415' }) // FIXME: use res.status
            }
        }
        // POST with empty body is allowed by actions
        if (req.method in { PUT: 1, PATCH: 1 }) {
            if (req.headers['content-length'] === '0') {
                res.status(400).json({ error: { message: 'Expected non-empty body', statusCode: 400, code: '400' } })
                return
            }
        }

        return jsonBodyParser(req, res, next)
    }
}

module.exports = class ODataAdapter extends HttpAdapter {
    log(req) {
        // simplest ever
        console.log(req.method, req.baseUrl, req.url)
    }

    request4(args) {
        return new NoaRequest(args)
    }

    get router() {
        return super.router.use(ODataAdapterMiddleware.odata_version)
            .use(/^\/$/, ODataAdapterMiddleware.sericeDocument(this))
            .use('/\\$metadata', ODataAdapterMiddleware.metadata(this))
            .use(ODataAdapterMiddleware.parse(this))
            .use(ODataAdapterMiddleware.odata_streams)
            .post('/\\$batch', ODataAdapterMiddleware.batch(this))
            .head('*', (_, res) => res.sendStatus(405))
            .post('*', ODataAdapterMiddleware.create(this))
            .post('*', ODataAdapterMiddleware.operation(this)) //> action
            .get('*', ODataAdapterMiddleware.operation(this)) //> function
            .get('*', ODataAdapterMiddleware.stream(this))
            .get('*', ODataAdapterMiddleware.read(this))
            .put('*', ODataAdapterMiddleware.update(this))
            .put('*', ODataAdapterMiddleware.create(this, 'upsert'))
            .patch('*', ODataAdapterMiddleware.update(this))
            .patch('*', ODataAdapterMiddleware.create(this, 'upsert'))
            .delete('*', ODataAdapterMiddleware.delete(this))
            .use(ODataAdapterMiddleware.error(this))
    }
}

// REVISIT: ugly hack -> eliminate
class NoaRequest extends cds.Request {
    // REVISIT: all usages of .protocol are very bad style, violating modularization
    get protocol() {
        return 'odata'
    }
    // AFC uses unofficial req._queryOptions -> which is bad! -> should eliminate
    get _queryOptions() {
        cds.utils.deprecated({ kind: '', old: 'req._queryOptions', new: 'req._.req.query' })
        return this.req?.query
    }
}