module.exports = function (srv){

    srv.on('submitOrder', async (req) =>{
        const {Authors, Books} = cds.entities
        // cds.context.tx = RootTransaction for ApplicationService BECAUSE middlware TXs us
        // cds.context.transactions.entries().next().value[1] == cds.context.tx
        await srv.tx( async (tx) => { // if we run srv.tx() 
            // here cds.context.tx = RootTransaction for ApplicationService BUT NEW ONE
            const results = await tx.insert({name:'Emily Brontë'}).into(Authors) // data from the insert??!!
            await tx.insert({ title: 'Wuthering Heights', author: {ID: null} }).into(Books)
        })
        return { stock: req.data.quantity}
    })

    srv.on('_submitOrder', async (req) =>{
        const {Authors, Books} = cds.entities
        // cds.context.tx = RootTransaction for ApplicationService BECAUSE middlware TXs us
        // cds.context.transactions.entries().next().value[1] == cds.context.tx
        // await cds.run('SELECT 1;') // this leads to a DEADLOCK in sqlite
        await cds.tx( async () => { // if we run cds.tx() which is basically cds.db.tx() 
            // here cds.context.tx = RootTransaction for SQLiteService
            const results = await cds.db.insert({name:'Emily Brontë'}).into(Authors) // InsertResults
            await cds.db.insert({ title: 'Wuthering Heights', author: {ID: null} }).into(Books)
        })
        return { stock: req.data.quantity}
    })
}