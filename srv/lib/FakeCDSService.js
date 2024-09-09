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
    console.log("DISPATCH", req.event, req.query.target.name)
    return this.handle(req)
  }

  async handle(req){
    throw new Error('I dont know how to do it!')
    // but my subclassess would do something like this
    req.target = req.query.target // patch so that middleware etag shit works
    return this.dbService.run(req.query, req.data) // call instance of cds db service
  }
  
  tx(fn) {
    throw new Error('I dont know how to do it!')
    // but my subclassess will somehow obtain tx from cds srv_tx
}

}

