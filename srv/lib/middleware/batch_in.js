const cds = require('@sap/cds')

const express = require('express')
const textBodyParser = express.text({ type: '*/*' }) // somehow this type indeed matters..

const multipartToJson = require('@sap/cds/libx/odata/parse/multipartToJson')
const { getBoundary } = require('@sap/cds/libx/odata/utils')

module.exports = adapter => {
    const { service } = adapter

    return function odata_batch_in(req, res, next) {

        const url = req.url.replace(req.baseUrl, "")
        if (url != "/$batch") return next()

        return textBodyParser(req, res, function odata_batch_parse(err) {
            if (err) return next(err)

            const boundary = getBoundary(req)

            try {
                multipartToJson(req.body, boundary).then( batch => {
                    batch.boundary = boundary
                    req.batch = batch
                    next()
                })
            } catch (e) {
                next(e)
            }
        })

    }
}
