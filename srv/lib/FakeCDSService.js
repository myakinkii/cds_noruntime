module.exports = class FakeCDSService {

  constructor(name, model, o) {
    this.name = name
    this.options = o
    this.model = model
    this.definition = model.definitions[this.name]
  }

  get endpoints() {
    return [{ kind: this.options.to || "odata", path: this.options.at || "/odata/v4/" + this.name.toLowerCase() }]
  }

  set endpoints(p) {
    // compat to real cds serve
  }

  async run(req, data) {
    console.log("RUN", typeof req)
    if (typeof req === 'function') {
      const fn = req;
      return fn(this)
    } else {
      return this.dispatch(req)
    }
  }

  async dispatch(req) {
    console.log("DISPATCH", req.event, req.query.target.name)
    return this.handle(req)
  }

  async handle(req) {
    console.log("HANDLE", req.event, JSON.stringify(req.query))
    req.target = req.query.target // patch so that middleware etag shit works
    return this.dbService.run(req.query, req.data) // call instance of our "db" service
  }

  tx(fn) { // its ONLY here to fix $batch handler in ODataAdapter
    return Promise.resolve(fn({})) // have no idea what that is, but it kinda does something
    // looks like the purpose of that stuf is to properly wait until all transactions are done..
    // in our case we have new RootTransaction for each query so we dont care
  }

}

