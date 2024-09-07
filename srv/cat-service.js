const cds = require('@sap/cds')

module.exports = class CatalogService extends cds.Service { 
  
  init(){
    const { Books } = this.entities

    this.on ('submitOrder', this.handleSubmitOrder)
    this.after ('READ', Books, this.afterRead)

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

