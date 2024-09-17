module.exports = () => {
    return function cds_context (req, res, next) {
      // cds._context.run (ctx, next)
      // if I understand correctly, this stuff called next with new EventContext in AsyncLocalStorage thread(?)
      // or just a "wrapper", it seems to me now..
      // can read this stuff here https://docs.nestjs.com/recipes/async-local-storage as they show something similar
      // or this https://dev.to/george_k/using-asynclocalstorage-in-nodejs-real-world-use-cases-3ekd
        cds.context = {} // but now we just try to fake it and see what happens in proper nest runtime
        // and fail because there is setter for cds.context that still calls this._context.enterWith(x)
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