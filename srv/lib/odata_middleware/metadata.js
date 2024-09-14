const cds = require('@sap/cds')

module.exports = adapter => {
  const { service } = adapter

  return async function metadata(req, res, next) {

    const url = req.url.replace(req.baseUrl, "")
    if (!url.startsWith("/$metadata")) return next()

    const locale = cds.context.locale
    const edmx = cds.compile.to.edmx(service.model, { service: service.definition.name })
    const localized = cds.localize(service.model, locale, edmx)
    res.set('Content-Type', 'application/xml')
    return res.send(localized)
  }
}