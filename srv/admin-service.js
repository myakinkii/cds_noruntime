const cds = require('@sap/cds/lib')

module.exports = class AdminService extends cds.Service { 
  
  init(){
    const { Books } = this.entities

    this.before ('NEW', Books.drafts, this.genid)

    // these are our generic crud handlers
    this.on(['CREATE', 'READ', 'UPDATE', 'DELETE', 'UPSERT'], '*', async function (req) {
      const result = await cds.tx(req).run(req.query, req.data)
      return result
    })

    return super.init()
  }

  get endpoints() { 
    return [{ kind: this.options.to || "odata", path: this.options.at || "/odata/v4/" + this.name.toLowerCase()}]
  }

  async run(req, data){
    console.log("RUN", typeof req)
    return super.run(req, data)
  }

  async dispatch(req){
    console.log("DISPATCH", req.event, JSON.stringify(req.query))
    return super.dispatch(req)
  }

  async handle(req){
    console.log("HANDLE", req.event, JSON.stringify(req.query))
    return super.handle(req)
  }

  // Generate primary keys for target entity in request
  async genid (req) {
    const {ID} = await cds.tx(req).run (SELECT.one.from(req.target.actives).columns('max(ID) as ID'))
    req.data.ID = ID - ID % 100 + 100 + 1
  }
  
}