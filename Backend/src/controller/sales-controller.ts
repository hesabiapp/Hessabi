import { Request, Response } from 'express'
import Sales from '../collections/sales-collection.js'
import Product from '../collections/product-collection.js'
import { validateSales } from '../function/zodValidators.js'
import { salesCalculation } from '../function/salesCalculation.js'
import Counter from '../models/Counter.js'

const generateInvoiceNumber = async (businessId: string) => {
    const counter = await Counter.findOneAndUpdate(
        { name: 'invoice', businessID: businessId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    )
    return `INV-${String(counter.seq).padStart(3, '0')}`
}


// FIX: new endpoint — peeks at the next invoice number without incrementing the counter
export const getNextInvoiceNumber = async (req: Request, res: Response) => {
    const user: any = req.user
    const counter = await Counter.findOne({ name: 'invoice', businessID: user.businessId })
    const next = (counter?.seq ?? 0) + 1
    return res.status(200).json({ invoiceNumber: `INV-${String(next).padStart(3, '0')}` })
}


export const addSales = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(404).json({ message: 'input is required.' })
    }

    const { date, customerName, items, source, paymentMethod } = req.body
    const user: any = req.user
    const createdBy = `${user.username} (${user.role})`
    const invoiceNumber = await generateInvoiceNumber(user.businessId)
    

    let products: any[]
    try {
        products = await Promise.all(
            items.map(async (item: any) => {
                const foundProduct = await Product.findById(item.productId)
                if (!foundProduct) throw new Error('Product not found.')
                return foundProduct
            })
        )
    } catch (error: any) {
        return res.status(400).json({ message: error.message })
    }

    // Sales calculation
    const { sales: itemSales, totalSales, totalNetSales, totalVat, totalCost, grossProfit } = salesCalculation(items, products)

    const salesVal = validateSales.safeParse({
        invoiceNumber, date, customerName,
        items: itemSales,
        totalSales, totalNetSales, totalVat, totalCost, grossProfit,
        source, paymentMethod, createdBy
    })
    if (!salesVal.success) {
        const error = salesVal.error.issues[0]
        return res.status(400).send({ input: error.path, message: error.message })
    }

    // Stock validation (check first before any deduction)
    for (let index = 0; index < itemSales.length; index++) {
        const p = products[index]
        const hasSizes = p.sizes && p.sizes.length > 0

        if (hasSizes) {
            const sizeEntry = p.sizes.find((s: any) => s.size === itemSales[index].size)
            if (!sizeEntry) {
                return res.status(400).json({
                    message: `Size ${itemSales[index].size} is not available for product ${itemSales[index].itemName}.`
                })
            }
            if (itemSales[index].quantity > sizeEntry.stock) {
                return res.status(400).json({
                    message: `Not enough stock for product ${itemSales[index].itemName} size ${itemSales[index].size}.`
                })
            }
        } else {
            if (itemSales[index].quantity > p.stock) {
                return res.status(400).json({
                    message: `Not enough stock for product ${itemSales[index].itemName}.`
                })
            }
        }
    }

    // Stock deduction
    for (let index = 0; index < itemSales.length; index++) {
        const p = products[index]
        const hasSizes = p.sizes && p.sizes.length > 0

        if (hasSizes) {
            const sizeEntry = p.sizes.find((s: any) => s.size === itemSales[index].size)
            if (sizeEntry) {
                sizeEntry.stock -= itemSales[index].quantity
                p.stock = p.sizes.reduce((sum: number, s: any) => sum + s.stock, 0)
                await p.save()
            }
        } else {
            p.stock -= itemSales[index].quantity
            await p.save()
        }
    }

    const sales = await Sales.create({
        businessID: user.businessId,
        invoiceNumber, date, customerName,
        items: itemSales,
        totalSales,
        totalNetSales,
        totalVat,
        totalCost,
        grossProfit,
        source, paymentMethod, createdBy
    })

    return res.status(200).json({
        message:        'Sales successfully added.',
        invoiceNumber:  sales.invoiceNumber,
        date:           sales.date,
        customerName:   sales.customerName,
        paymentMethod:  sales.paymentMethod,
        items:          sales.items,
        totalSales:     sales.totalSales,
        totalNetSales:  sales.totalNetSales,
        totalVat:       sales.totalVat,
        totalCost:      sales.totalCost,
        grossProfit:    sales.grossProfit,
        source:         sales.source,
        createdBy:      sales.createdBy
    })
}

export const viewSales = async (req: Request, res: Response) => {
    const user: any = req.user

    const salesRecords = await Sales.find({ businessID: user.businessId })
    if (salesRecords.length === 0) {
        return res.status(400).send({ message: 'Sales records are empty.' })
    }

    const sales = salesRecords.map((sale: any) => ({
        invoiceNumber:  sale.invoiceNumber,
        date:           sale.date,
        customerName:   sale.customerName,
        paymentMethod:  sale.paymentMethod,
        items:          sale.items,
        totalSales:     sale.totalSales,
        totalNetSales:  sale.totalNetSales,
        totalVat:       sale.totalVat,
        totalCost:      sale.totalCost,
        grossProfit:    sale.grossProfit,
        source:         sale.source,
        createdBy:      sale.createdBy
    }))

    return res.status(200).send({ message: 'Sales records are found', sales })
}

export const viewSale = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(400).send({ message: 'input is required.' })
    }

    const { invoiceNumber } = req.body
    const user: any = req.user

    const sale = await Sales.findOne({ invoiceNumber, businessID: user.businessId })
    if (!sale) {
        return res.status(400).send({ message: 'Sale is not found' })
    }

    return res.status(200).send({
        message:        'Sale record is found',
        invoiceNumber:  sale.invoiceNumber,
        date:           sale.date,
        customerName:   sale.customerName,
        items:          sale.items,
        totalSales:     sale.totalSales,
        totalNetSales:  sale.totalNetSales,
        totalVat:       sale.totalVat,
        totalCost:      sale.totalCost,
        grossProfit:    sale.grossProfit,
        source:         sale.source,
        createdBy:      sale.createdBy
    })
}

export const deleteSale = async (req: Request, res: Response) => {
    try {
        const { invoiceNumber } = req.body
        const user: any = req.user

        if (!invoiceNumber) return res.status(400).json({ message: 'Invoice number is required.' })

        const sale = await Sales.findOne({ invoiceNumber, businessID: user.businessId })
        if (!sale) return res.status(404).json({ message: 'Sale not found.' })

        // Restore stock
        for (const item of sale.items) {
            const product = await Product.findById(item.productId)
            if (!product) continue

            const hasSizes = product.sizes && product.sizes.length > 0

            if (hasSizes && item.size) {
                const sizeEntry = product.sizes.find((s: any) => s.size === item.size)
                if (sizeEntry) {
                    sizeEntry.stock += item.quantity
                    product.stock = product.sizes.reduce((sum: number, s: any) => sum + s.stock, 0)
                    await product.save()
                }
            } else {
                product.stock += item.quantity
                await product.save()
            }
        }

        await Sales.deleteOne({ invoiceNumber, businessID: user.businessId })

       
        const remainingSales = await Sales.countDocuments({ businessID: user.businessId })
        if (remainingSales === 0) {
            await Counter.findOneAndUpdate(
                { name: 'invoice', businessID: user.businessId },
                { $set: { seq: 0 } }
            )
        }

        return res.status(200).json({ message: 'Sale deleted and stock restored.' })

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err })
    }
}


export const importSales = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(400).json({ message: 'Input is required.' })
    }

    const { rows } = req.body
    const user: any = req.user
    const createdBy = `${user.username} (${user.role})`

    if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: 'No rows provided.' })
    }

    const results: { invoice: string; status: string; message?: string }[] = []

    const grouped: Record<string, any[]> = {}
    for (const row of rows) {
        if (!grouped[row.invoice]) grouped[row.invoice] = []
        grouped[row.invoice].push(row)
    }

    for (const [invoiceNumber, invoiceRows] of Object.entries(grouped)) {
        try {
            const existing = await Sales.findOne({ invoiceNumber })
            if (existing) {
                results.push({ invoice: invoiceNumber, status: 'skipped', message: 'Invoice already exists.' })
                continue
            }

            const firstRow = invoiceRows[0]

            const products: any[] = []
            for (const row of invoiceRows) {
                const product = await Product.findOne({
                    businessID: user.businessId,
                    itemName: { $regex: new RegExp(`^${row.productName}$`, 'i') }
                })
                if (!product) throw new Error(`Product not found: ${row.productName}`)
                products.push(product)
            }

            const items = invoiceRows.map((row, i) => ({
                productId: products[i]._id.toString(),
                itemName:  products[i].itemName,
                color:     products[i].color,
                size:      row.size ?? '',
                quantity:  Number(row.quantity),
                unitPrice: Number(row.price),
            }))

            const { sales: itemSales, totalSales, totalNetSales, totalVat, totalCost, grossProfit } = salesCalculation(items, products)

            // Stock validation
            for (let i = 0; i < itemSales.length; i++) {
                const p = products[i]
                const hasSizes = p.sizes && p.sizes.length > 0
                if (hasSizes) {
                    const sizeStock = p.sizes.find((s: any) => s.size === itemSales[i].size)
                    if (!sizeStock) throw new Error(`Size ${itemSales[i].size} not available for ${itemSales[i].itemName}`)
                    if (itemSales[i].quantity > sizeStock.stock) throw new Error(`Not enough stock for ${itemSales[i].itemName} size ${itemSales[i].size}`)
                } else {
                    if (itemSales[i].quantity > p.stock) throw new Error(`Not enough stock for ${itemSales[i].itemName}`)
                }
            }

            // Stock deduction
            for (let i = 0; i < itemSales.length; i++) {
                const p = products[i]
                const hasSizes = p.sizes && p.sizes.length > 0
                if (hasSizes) {
                    const sizeStock = p.sizes.find((s: any) => s.size === itemSales[i].size)
                    if (sizeStock) {
                        sizeStock.stock -= itemSales[i].quantity
                        p.stock = p.sizes.reduce((sum: number, s: any) => sum + s.stock, 0)
                        await p.save()
                    }
                } else {
                    p.stock -= itemSales[i].quantity
                    await p.save()
                }
            }

            let paymentMethod = firstRow.payment
            let paymentCorrected = false
            if (!['Cash', 'BenefitPay'].includes(paymentMethod)) {
                paymentMethod = 'Cash'
                paymentCorrected = true
            }

            await Sales.create({
                businessID: user.businessId,
                invoiceNumber,
                date:          new Date(firstRow.date),
                customerName:  firstRow.customer,
                items:         itemSales,
                totalSales,
                totalNetSales,
                totalVat,
                totalCost,
                grossProfit,
                source:        'excel',
                paymentMethod,
                createdBy,
            })

            // Sync counter so manual adds always continue from the highest imported number
            const invoiceMatch = invoiceNumber.match(/\d+/)
            if (invoiceMatch) {
                const invoiceSeq = parseInt(invoiceMatch[0])
               await Counter.findOneAndUpdate(
    { name: 'invoice', businessID: user.businessId },
    { $max: { seq: invoiceSeq } },
    { upsert: true }
)
            }

            results.push({
                invoice: invoiceNumber,
                status: 'success',
                ...(paymentCorrected && { message: `Payment method was invalid, defaulted to 'Cash'.` })
            })

        } catch (err: any) {
            results.push({ invoice: invoiceNumber, status: 'error', message: err.message })
        }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount   = results.filter(r => r.status === 'error').length

    return res.status(200).json({
        message: `Import complete. ${successCount} saved, ${errorCount} failed.`,
        results,
    })
}