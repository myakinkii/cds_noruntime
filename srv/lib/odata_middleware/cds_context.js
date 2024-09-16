module.exports = () => {
    return function cds_context (req, res, next) {
      // if I understand correctly, this stuff called next with new EventContext in AsyncLocalStorage thread(?)
      // need to read more about it..
      // cds._context.run (ctx, next)
        cds.context = {} // but now we just try to fake it and see what happens in proper nest runtime
        next()
    }
  }

/* ORG IMPLEMENTATION
const crippled_corr_id = 'x-correlationid'
const req_id = 'x-request-id'
const vr_id = 'x-vcap-request-id'
const { uuid } = cds.utils
const { EventContext } = cds

module.exports = () => {
  return function cds_context (req, res, next) {
    const id = req.headers[corr_id] ??= req.headers[req_id] || req.headers[vr_id] || req.headers[crippled_corr_id] || uuid()
    const ctx = EventContext.for ({ id, http: { req, res } })
    res.set ('X-Correlation-ID', id) // Note: we use capitalized style here as that's common standard in HTTP world
    cds._context.run (ctx, next)
  }
}
*/