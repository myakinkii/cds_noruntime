const getODataMetadata = require('@sap/cds/libx/odata/utils/metadata')

const { STATUS_CODES } = require('http')
const CRLF = '\r\n'

function writeResponseMultipart(responses, res, rejected, group, boundary) {
    if (group) {
        res.write(`--${boundary}${CRLF}`)
        res.write(`content-type: multipart/mixed;boundary=${group}${CRLF}${CRLF}`)
    }
    const header = group || boundary
    if (rejected) {
        const resp = responses.find(r => r.status === 'fail')
        if (resp.separator && res._writeSeparator) res.write(resp.separator)
        resp.txt.forEach(txt => {
            res.write(`--${header}${CRLF}`)
            res.write(`${txt}`)
        })
    } else {
        for (const resp of responses) {
            if (resp.separator) res.write(resp.separator)
            resp.txt.forEach(txt => {
                res.write(`--${header}${CRLF}`)
                res.write(`${txt}`)
            })
        }
    }
    if (group) res.write(`${CRLF}--${group}--${CRLF}`)
    // indicates that we need to write a potential separator before the next error response
    res._writeSeparator = true
}

function formatResponseMultipart(request) {
    const response = request
    const content_id = request.headers['content-id']

    let txt = `content-type: application/http${CRLF}content-transfer-encoding: binary${CRLF}`
    if (content_id) txt += `content-id: ${content_id}${CRLF}`
    txt += CRLF
    txt += `HTTP/1.1 ${response.statusCode} ${STATUS_CODES[response.statusCode]}${CRLF}`

    // REVISIT: tests require specific sequence
    const headers = {
        ...response.headers,
        ...(response.statusCode !== 204 && { 'content-type': 'application/json;odata.metadata=minimal' })
    }
    delete headers['content-length'] //> REVISIT: expected by tests

    for (const key in headers) {
        txt += key + ': ' + headers[key] + CRLF
    }
    txt += CRLF

    if (response._chunk) {
        let _json
        try {
            // REVISIT: tests require specific sequence -> fix and simply use res._chunk
            _json = JSON.parse(response._chunk)
            if (typeof _json !== 'object') throw new Error('not an object')
            let meta = [],
                data = []
            for (const [k, v] of Object.entries(_json)) {
                if (k.startsWith('@')) meta.push(`"${k}":${typeof v === 'string' ? `"${v.replaceAll('"', '\\"')}"` : v}`)
                else data.push(JSON.stringify({ [k]: v }).slice(1, -1))
            }
            const _json_as_txt = '{' + meta.join(',') + (meta.length && data.length ? ',' : '') + data.join(',') + '}'
            txt += _json_as_txt
        } catch {
            // ignore error and take chunk as is (a text)
            txt += response._chunk
            txt = txt.replace('content-type: application/json;odata.metadata=minimal', 'content-type: text/plain')
        }
    }

    return [txt]
}

// YA BEAUTY!!! WHAT A HIT SON, WHAT A HIT!
module.exports = function odata_batch_out(batch, res) {

    batch.requests.forEach(r => {

        const property = false
        const isCollection = r.query.SELECT ? !r.query.SELECT.one : false
        const { context } = getODataMetadata(r.query, { result: r.result, isCollection })

        const odataResult = { '@odata.context': context }
        if (isCollection) {
            Object.assign(odataResult, { value: r.result })
        } else if (property) {
            Object.assign(odataResult, { value: r.result[property] })
        } else {
            Object.assign(odataResult, r.result[0]) // cuz now we have an array or nothing
        }

        r._chunk = JSON.stringify(odataResult)
        r.separator = Buffer.from(CRLF)
        r.txt = formatResponseMultipart(r)
    })

    res.setHeader('Content-Type', `multipart/mixed;boundary=${batch.boundary}`)

    writeResponseMultipart(batch.requests, res, false, undefined, batch.boundary)

    res.write(`${CRLF}--${batch.boundary}--${CRLF}`)

}
