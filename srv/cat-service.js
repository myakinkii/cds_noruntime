const cds = require('@sap/cds')
const { Books } = cds.entities ('sap.capire.bookshop')

module.exports = class CatalogService extends cds.ApplicationService { 
  
  init(){

    this.on ('submitOrder', this.handleSubmitOrder)
    this.after ('READ', 'ListOfBooks', this.afterRead)

    return super.init()
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

