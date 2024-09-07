const cds = require('@sap/cds')

module.exports = class CatalogService extends cds.Service { 
  
  init(){
    const { Books } = this.entities

    this.on ('submitOrder', this.handleSubmitOrder)
    this.after ('READ', Books, this.afterRead)

    // generic crud handler is just cds.db.run
    this.on(['CREATE', 'READ', 'UPDATE', 'DELETE', 'UPSERT'], '*', async (req) => cds.db.run(req.query, req.data))

    return super.init()
  }

  get endpoints() { 
    return [{ kind: this.options.to || "odata", path: this.options.at || "/odata/v4/" + this.name.toLowerCase()}]
  }

  set endpoints(p) {
    // compat to real cds serve
  }
  
  async run(req, data){
    console.log("RUN", typeof req)
    // return super.run(req, data)
    if (typeof req === 'function') {
      const fn = req;
      return fn(this)
    } else {
      return this.dispatch(req)
    }
  }

  async dispatch(req){
    console.log("DISPATCH", req.event, JSON.stringify(req.query))
    // return super.dispatch(req)
    return this.handle(req)
  }

  async handle(req){
    console.log("HANDLE", req.event, JSON.stringify(req.query))
    req.target = req.query.target // patch so that middleware etag shit works
    return super.handle(req)
  }

  // Reduce stock of ordered books if available stock suffices
  async handleSubmitOrder(req) {
    const {book,quantity} = req.data
    let {stock} = await SELECT `stock` .from (Books,book)
    if (stock >= quantity) {
      await UPDATE (Books,book) .with (`stock -=`, quantity)
      await this.emit ('OrderedBook', { book, quantity, buyer:req.user.id })
      return { stock }
    }
    else return req.error (409,`${quantity} exceeds stock for book #${book}`)
  }

  // Add some discount for overstocked books
  async afterRead (results, req) {
    results.forEach( each => { if (each.stock > 111) each.title += ` -- 11% discount!` })
  }
}

