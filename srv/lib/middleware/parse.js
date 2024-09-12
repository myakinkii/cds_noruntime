const cds = require('@sap/cds')
const { parse, urlify } = require('@sap/cds/libx/odata')
const { getKeysAndParamsFromPath } = require('@sap/cds/libx/common/utils/path')

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql

function _create(service, _query, data) {

  const {
      SELECT: { one, from },
      target
  } = _query

  const { keys, params } = getKeysAndParamsFromPath(from, service)

  Object.assign(data, keys)

  const query = INSERT.into(from).entries(data)
  
  return new cds.Request({ query, params, data})
}

function _read(service, _query) {

  let {
      SELECT: { from, one },
      target,
  } = _query

  const query = _query

  const { keys, params } = getKeysAndParamsFromPath(from, service)
  const data = keys //> for read and delete, we provide keys in req.data

  if (!query.SELECT.columns) query.SELECT.columns = ['*']

  return new cds.Request({ query, params, data})
}

function _update(service, _query, data) {

  const {
    SELECT: { one, from },
    target,
  } = _query

  const { keys, params } = getKeysAndParamsFromPath(from, service)
  
  Object.assign(data, keys)

  const query = UPDATE.entity(from).with(data)

  return new cds.Request({ query, params, data})
}

function _delete(service, _query) {

  const {
    SELECT: { one, from },
    target,
  } = _query

  const { keys, params } = getKeysAndParamsFromPath(from, service)
  const data = keys //> for read and delete, we provide keys in req.data

  const query = DELETE.from(from)

  return new cds.Request({ query, params, data})

}

const cdsReqFactory = { GET : _read, POST: _create, PATCH: _update, PUT: _update, DELETE: _delete }

function modifyRequestObj (req, service){

  const url = req.url.replace(req.baseUrl, "")
  try {
    const _query = parse(url, { service, strict: true })
    const cdsReq = cdsReqFactory[req.method](service, _query, req.body)

    req.event = cdsReq.event
    req.target = cdsReq.target
    req.params = cdsReq.params
    req.data = cdsReq.data
    req.query = cdsReq.query
    req.cdsReq = cdsReq
  } catch (e){
    console.log('PARSE.FAILED', e.message)
  }
}

module.exports = adapter => {
  const { service } = adapter

  return function odata_parse_url(req, _, next) {

    if (req.batch){
      req.batch.requests.forEach( r => modifyRequestObj(r, service) )
    } else {
      modifyRequestObj(req, service)
    }

    next()
  }
}
