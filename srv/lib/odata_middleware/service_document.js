const cds = require('@sap/cds')

module.exports = adapter => {
  const { service } = adapter

  return function service_document(req, res, next) {

    const url = req.url.replace(req.baseUrl, "")
    if (url != "/") return next()

    const model = cds.context.model || cds.model

    // const srvEntities = model.entities(service.definition.name)
    const srvEntities = model.entities(service.definition.name)

    const exposedEntities = Object.keys(srvEntities).filter(
      entityName => !srvEntities[entityName]['@cds.api.ignore'] && entityName !== 'DraftAdministrativeData'
    )

    return res.json({
      '@odata.context': '$metadata', // link to metadata document
      value: exposedEntities.map(e => {
        const e_ = e.replace(/\./g, '_')
        return { name: e_, url: e_ }
      })
    })
  }
}
