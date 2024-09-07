const srv_tx = require('@sap/cds/lib/srv/srv-tx')

module.exports = class FakeCDSService  {
  
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
  
  tx(fn) { // this stuff kinda fixes batch, but only provides root transaction
    const expectedRootTransaction = srv_tx.call(this, fn)
    return expectedRootTransaction
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
  }

}

