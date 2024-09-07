const cds = require('@sap/cds')

module.exports = class CatalogService  {
  
  constructor (name, model, o) {
    this.name = name
    this.options = o
    this.model = model
    this.definition = model.definitions[this.name]
  }

  get endpoints() { 
    return [{ kind: this.options.to || "odata", path: this.options.at || "/odata/v4/" + this.name.toLowerCase()}]
  }

  set endpoints(p) {
    // compat to real cds serve
  }
  
  async run(req, data){
    console.log("RUN", typeof req)
    if (typeof req === 'function') {
      const fn = req;
      return fn(this)
    } else {
      return this.dispatch(req)
    }
  }

  async dispatch(req){
    console.log("DISPATCH", req.event, JSON.stringify(req.query))
    return this.handle(req)
  }

  async handle(req){
    console.log("HANDLE", req.event, JSON.stringify(req.query))
    req.target = req.query.target // patch so that middleware etag shit works
    return cds.db.run(req.query, req.data)
  }

}

