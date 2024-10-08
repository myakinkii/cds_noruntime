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

  return new cds.Request({ query, params, data })
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

  return new cds.Request({ query, params, data })
}

function _update(service, _query, data) {

  const {
    SELECT: { one, from },
    target,
  } = _query

  const { keys, params } = getKeysAndParamsFromPath(from, service)

  Object.assign(data, keys)

  const query = UPDATE.entity(from).with(data)

  return new cds.Request({ query, params, data })
}

function _delete(service, _query) {

  const {
    SELECT: { one, from },
    target,
  } = _query

  const { keys, params } = getKeysAndParamsFromPath(from, service)
  const data = keys //> for read and delete, we provide keys in req.data

  const query = DELETE.from(from)

  return new cds.Request({ query, params, data })

}

function _operation(service, _query, data, operation) {

  const event = operation.replace(`${service.definition.name}.`, '')

  if (service.model.definitions[operation]) { // unbound
    operation = service.model.definitions[operation]
    return new cds.Request({ event, data })
  }

  // bound
  _query.SELECT.from.ref.pop()
  let cur = { elements: service.model.definitions }
  for (const each of _query.SELECT.from.ref) {
    cur = cur.elements[each.id || each]
    if (cur._target) cur = cur._target
  }

  operation = cur.actions[operation]
  const { keys, params } = getKeysAndParamsFromPath(_query.SELECT.from, service)

  return new cds.Request({ query: _query, params, data })
}

const cdsReqFactory = { GET: _read, POST: _create, PATCH: _update, PUT: _update, DELETE: _delete }

function modifyRequestObj(req, service) {

  const url = req.url.replace(req.baseUrl, "")
  try {
    const _query = parse(url, { service, strict: true })
    const { operation, args } = _query.SELECT?.from.ref?.slice(-1)[0] || {}
    const cdsReq = operation ? _operation(service, _query, args || req.body, operation) : cdsReqFactory[req.method](service, _query, req.body)

    req.event = cdsReq.event
    req.params = cdsReq.params
    req.data = cdsReq.data
    req.query = cdsReq.query
    req.target = cdsReq.query?.target // when ubnound action, we have no query
    req.cdsReq = cdsReq
    // console.log(urlify(req.query)) // our middleware chain can be called more than once btw
    // has something to do with express RouterProxy? https://github.com/nestjs/nest/issues/1628
  } catch (e) {
    console.log('PARSE.FAILED', e.message)
  }
}

module.exports = adapter => {
  const { service } = adapter

  return function odata_parse_url(req, _, next) {

    if (req.batch) {
      req.batch.requests.forEach(r => modifyRequestObj(r, service))
    } else {
      modifyRequestObj(req, service)
    }

    next()
  }
}
