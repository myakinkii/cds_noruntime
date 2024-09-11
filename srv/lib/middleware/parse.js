const { parse, urlify } = require('@sap/cds/libx/odata')

module.exports = adapter => {
  const { service } = adapter

  return function odata_parse_url(req, _, next) {

    const url = req.url.replace(req.baseUrl, "")

    req._query = parse(url, { service, baseUrl: req.baseUrl, strict: true })

    next()
  }
}
