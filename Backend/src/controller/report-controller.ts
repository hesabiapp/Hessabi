
import { Request, Response } from 'express'
import Sales      from '../collections/sales-collection.js'
import Expenses   from '../collections/expenses-collection.js'
import Product    from '../collections/product-collection.js'
import { bhd, fmtDate, filterByDate, htmlWrapper, htmlToPdf } from '../function/reportStyles.js'

// Sales Summary 
export const salesSummaryReport = async (req: Request, res: Response) => {
  try {
    const user: any = req.session.user
    const { startDate, endDate } = req.body
    const allSales = await Sales.find({ businessID: user.businessId }).sort({ date: -1 })
    const sales    = filterByDate(allSales, startDate, endDate)

    const totalRevenue = sales.reduce((s, x) => s + x.totalSales,  0)
    const totalCost    = sales.reduce((s, x) => s + x.totalCost,   0)
    const totalProfit  = sales.reduce((s, x) => s + x.grossProfit, 0)
    const cashCount    = sales.filter(s => s.paymentMethod === 'Cash').length
    const benefitCount = sales.filter(s => s.paymentMethod === 'BenefitPay').length

    const rows = sales.slice(0, 50).map(s => `
      <tr>
        <td>${s.invoiceNumber}</td>
        <td>${fmtDate(String(s.date))}</td>
        <td>${s.customerName}</td>
        <td>${s.items.length}</td>
        <td class="td-right amount">${bhd(s.totalSales)}</td>
        <td class="td-right profit">${bhd(s.grossProfit)}</td>
        <td class="td-center"><span class="${s.paymentMethod === 'Cash' ? 'badge-cash' : 'badge-benefit'}">${s.paymentMethod}</span></td>
      </tr>`).join('')

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card">      <div class="kpi-label">Total Revenue (incl. VAT)</div><div class="kpi-value">${bhd(totalRevenue)}</div><div class="kpi-sub">${sales.length} transactions</div></div>
        <div class="kpi-card red">  <div class="kpi-label">Total Cost</div>              <div class="kpi-value red">${bhd(totalCost)}</div></div>
        <div class="kpi-card green"><div class="kpi-label">Gross Profit</div>            <div class="kpi-value green">${bhd(totalProfit)}</div><div class="kpi-sub">${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% margin</div></div>
        <div class="kpi-card gold"> <div class="kpi-label">Payment Split</div>           <div class="kpi-value gold">${cashCount} / ${benefitCount}</div><div class="kpi-sub">Cash / BenefitPay</div></div>
      </div>
      <div class="section">
        <div class="section-title">Transaction Details ${sales.length > 50 ? '(showing latest 50)' : ''}</div>
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th class="td-right">Revenue</th><th class="td-right">Profit</th><th class="td-center">Payment</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px">No sales in this period</td></tr>'}</tbody>
        </table>
      </div>`

    const subtitle = startDate && endDate ? `${fmtDate(startDate)} – ${fmtDate(endDate)}` : 'All time'
    const pdf = await htmlToPdf(htmlWrapper('Sales Summary Report', subtitle, body))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="sales-summary.pdf"' })
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate report.' })
  }
}

//  Profit & Loss 
export const profitLossReport = async (req: Request, res: Response) => {
  try {
    const user: any = req.session.user
    const { startDate, endDate } = req.body
    const [allSales, allExpenses] = await Promise.all([
      Sales.find({ businessID: user.businessId }),
      Expenses.find({ businessID: user.businessId }),
    ])
    const sales    = filterByDate(allSales,    startDate, endDate)
    const expenses = filterByDate(allExpenses, startDate, endDate)

    const totalRevenue  = sales.reduce((s, x) => s + x.totalSales,  0)
    const totalNetSales = sales.reduce((s, x) => s + (x.totalNetSales ?? x.totalSales), 0)
    const totalVat      = sales.reduce((s, x) => s + (x.totalVat ?? 0), 0)
    const totalCOGS     = sales.reduce((s, x) => s + x.totalCost,   0)
    const grossProfit   = sales.reduce((s, x) => s + x.grossProfit, 0)
    const totalExpenses = expenses.reduce((s, x) => s + x.amount,   0)
    const netProfit     = grossProfit - totalExpenses

    const expCat: Record<string, number> = {}
    expenses.forEach(e => { expCat[e.category] = (expCat[e.category] || 0) + e.amount })
    const expRows = Object.entries(expCat).map(([cat, amt]) => `
      <tr>
        <td>${cat}</td>
        <td class="td-right loss">${bhd(amt)}</td>
        <td class="td-right">${totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : 0}%</td>
      </tr>`).join('')

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card">      <div class="kpi-label">Total Revenue (incl. VAT)</div><div class="kpi-value">${bhd(totalRevenue)}</div></div>
        <div class="kpi-card red">  <div class="kpi-label">COGS + Expenses</div>          <div class="kpi-value red">${bhd(totalCOGS + totalExpenses)}</div></div>
        <div class="kpi-card ${netProfit >= 0 ? 'green' : 'red'}"><div class="kpi-label">Net Profit</div><div class="kpi-value ${netProfit >= 0 ? 'green' : 'loss'}">${bhd(netProfit)}</div><div class="kpi-sub">${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}% margin</div></div>
        <div class="kpi-card gold"> <div class="kpi-label">Gross Profit</div>             <div class="kpi-value gold">${bhd(grossProfit)}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Income Statement</div>
        <table>
          <tbody>
            <tr><td><strong>Revenue (incl. VAT)</strong></td><td class="td-right amount">${bhd(totalRevenue)}</td></tr>
            <tr><td>&nbsp;&nbsp;VAT Collected</td>          <td class="td-right" style="color:#888">(${bhd(totalVat)})</td></tr>
            <tr><td>&nbsp;&nbsp;Net Revenue (excl. VAT)</td><td class="td-right">${bhd(totalNetSales)}</td></tr>
            <tr><td>&nbsp;&nbsp;Cost of Goods Sold</td>     <td class="td-right loss">(${bhd(totalCOGS)})</td></tr>
            <tr style="background:#e8f5e9"><td><strong>Gross Profit</strong></td><td class="td-right profit"><strong>${bhd(grossProfit)}</strong></td></tr>
            <tr><td>&nbsp;&nbsp;Operating Expenses</td>     <td class="td-right loss">(${bhd(totalExpenses)})</td></tr>
            <tr style="background:${netProfit >= 0 ? '#e8f5e9' : '#fff5f5'}"><td><strong>Net Profit</strong></td><td class="td-right ${netProfit >= 0 ? 'profit' : 'loss'}"><strong>${bhd(netProfit)}</strong></td></tr>
          </tbody>
        </table>
      </div>
      <div class="section">
        <div class="section-title">Expenses by Category</div>
        <table>
          <thead><tr><th>Category</th><th class="td-right">Amount</th><th class="td-right">% of Total</th></tr></thead>
          <tbody>${expRows || '<tr><td colspan="3" style="text-align:center;color:#aaa;padding:20px">No expenses recorded</td></tr>'}</tbody>
        </table>
      </div>`

    const subtitle = startDate && endDate ? `${fmtDate(startDate)} – ${fmtDate(endDate)}` : 'All time'
    const pdf = await htmlToPdf(htmlWrapper('Profit & Loss Report', subtitle, body))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="profit-loss.pdf"' })
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate report.' })
  }
}

//  Top Products 
export const topProductsReport = async (req: Request, res: Response) => {
  try {
    const user: any = req.session.user
    const { startDate, endDate } = req.body
    const sales = filterByDate(await Sales.find({ businessID: user.businessId }), startDate, endDate)

    const pm: Record<string, { revenue: number; netRevenue: number; cost: number; profit: number; qty: number; sizes: Record<string, number> }> = {}
    sales.forEach(sale => sale.items.forEach((item: any) => {
      if (!pm[item.itemName]) pm[item.itemName] = { revenue: 0, netRevenue: 0, cost: 0, profit: 0, qty: 0, sizes: {} }
      pm[item.itemName].revenue    += item.itemTotalPrice ?? 0
      pm[item.itemName].netRevenue += item.itemNetPrice   ?? item.itemTotalPrice ?? 0
      pm[item.itemName].cost       += item.itemTotalCost  ?? 0
      pm[item.itemName].profit      = pm[item.itemName].netRevenue - pm[item.itemName].cost
      pm[item.itemName].qty        += item.quantity ?? 0
      pm[item.itemName].sizes[item.size] = (pm[item.itemName].sizes[item.size] || 0) + (item.quantity ?? 0)
    }))

    const sorted       = Object.entries(pm).sort((a, b) => b[1].revenue - a[1].revenue)
    const totalRevenue = sorted.reduce((s, [, d]) => s + d.revenue, 0)

    const rows = sorted.map(([name, d], i) => {
      const pct     = totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0
      const topSize = Object.entries(d.sizes).sort((a, b) => b[1] - a[1])[0]
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${name}</td>
          <td class="td-right">${d.qty} units</td>
          <td class="td-right amount">${bhd(d.revenue)}</td>
          <td class="td-right profit">${bhd(d.profit)}</td>
          <td><div class="bar-bg"><div class="bar-fill" style="width:${Math.min(pct, 100).toFixed(1)}%"></div></div><span style="font-size:10px;color:#888">${pct.toFixed(1)}%</span></td>
          <td class="td-center">${topSize ? `Size ${topSize[0]} (${topSize[1]})` : '—'}</td>
        </tr>`
    }).join('')

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card">      <div class="kpi-label">Products Sold</div>              <div class="kpi-value">${sorted.length}</div></div>
        <div class="kpi-card gold"> <div class="kpi-label">Total Revenue (incl. VAT)</div>  <div class="kpi-value gold">${bhd(totalRevenue)}</div></div>
        <div class="kpi-card green"><div class="kpi-label">Top Product</div>                <div class="kpi-value" style="font-size:13px">${sorted[0]?.[0] ?? '—'}</div></div>
        <div class="kpi-card">      <div class="kpi-label">Units Sold</div>                 <div class="kpi-value">${sorted.reduce((s, [, d]) => s + d.qty, 0)}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Product Performance Ranking</div>
        <table>
          <thead><tr><th>#</th><th>Product</th><th class="td-right">Units</th><th class="td-right">Revenue (incl. VAT)</th><th class="td-right">Profit (excl. VAT)</th><th>Revenue Share</th><th class="td-center">Top Size</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px">No sales data</td></tr>'}</tbody>
        </table>
      </div>`

    const subtitle = startDate && endDate ? `${fmtDate(startDate)} – ${fmtDate(endDate)}` : 'All time'
    const pdf = await htmlToPdf(htmlWrapper('Top Products Report', subtitle, body))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="top-products.pdf"' })
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate report.' })
  }
}

//  Expenses 
export const expensesBreakdownReport = async (req: Request, res: Response) => {
  try {
    const user: any = req.session.user
    const { startDate, endDate } = req.body
    const expenses = filterByDate(
      await Expenses.find({ businessID: user.businessId }).sort({ date: -1 }),
      startDate, endDate,
    )

    const total  = expenses.reduce((s, x) => s + x.amount, 0)
    const catMap: Record<string, number> = {}
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount })

    const catRows = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => `
      <tr>
        <td>${cat}</td>
        <td class="td-right loss">${bhd(amt)}</td>
        <td class="td-right">${total > 0 ? ((amt / total) * 100).toFixed(1) : 0}%</td>
        <td><div class="bar-bg"><div class="bar-fill" style="width:${total > 0 ? ((amt / total) * 100).toFixed(1) : 0}%;background:#c0392b"></div></div></td>
      </tr>`).join('')

    const rows = expenses.slice(0, 50).map(e => `
      <tr>
        <td>${fmtDate(String(e.date))}</td>
        <td>${e.category}</td>
        <td>${e.description || '—'}</td>
        <td>${e.createdBy}</td>
        <td class="td-right loss">${bhd(e.amount)}</td>
      </tr>`).join('')

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card red"><div class="kpi-label">Total Expenses</div>    <div class="kpi-value red">${bhd(total)}</div><div class="kpi-sub">${expenses.length} records</div></div>
        <div class="kpi-card">   <div class="kpi-label">Categories</div>         <div class="kpi-value">${Object.keys(catMap).length}</div></div>
        <div class="kpi-card">   <div class="kpi-label">Avg per Record</div>     <div class="kpi-value">${bhd(expenses.length > 0 ? total / expenses.length : 0)}</div></div>
        <div class="kpi-card gold"><div class="kpi-label">Largest Category</div> <div class="kpi-value" style="font-size:13px">${Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}</div></div>
      </div>
      <div class="section">
        <div class="section-title">By Category</div>
        <table>
          <thead><tr><th>Category</th><th class="td-right">Total</th><th class="td-right">% Share</th><th>Proportion</th></tr></thead>
          <tbody>${catRows || '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">No expenses</td></tr>'}</tbody>
        </table>
      </div>
      <div class="section">
        <div class="section-title">Expense Records ${expenses.length > 50 ? '(showing latest 50)' : ''}</div>
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Created By</th><th class="td-right">Amount</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">No records</td></tr>'}</tbody>
        </table>
      </div>`

    const subtitle = startDate && endDate ? `${fmtDate(startDate)} – ${fmtDate(endDate)}` : 'All time'
    const pdf = await htmlToPdf(htmlWrapper('Expenses Breakdown Report', subtitle, body))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="expenses-breakdown.pdf"' })
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate report.' })
  }
}

//  VAT Report 
export const vatReport = async (req: Request, res: Response) => {
  try {
    const user: any = req.session.user
    const { startDate, endDate } = req.body
    const sales = filterByDate(
      await Sales.find({ businessID: user.businessId }).sort({ date: -1 }),
      startDate, endDate,
    )

    let totalVat = 0, totalNet = 0, totalGross = 0
    const productVat: Record<string, { net: number; vat: number; gross: number; qty: number }> = {}

    sales.forEach(sale => sale.items.forEach((item: any) => {
      const vatRate = item.vatRate ?? 0
      const gross   = item.itemTotalPrice ?? 0
      const net     = item.itemNetPrice   ?? gross / (1 + vatRate / 100)
      const vatAmt  = item.itemVatAmount  ?? (gross - net)
      totalGross += gross; totalNet += net; totalVat += vatAmt
      if (!productVat[item.itemName]) productVat[item.itemName] = { net: 0, vat: 0, gross: 0, qty: 0 }
      productVat[item.itemName].gross += gross
      productVat[item.itemName].net   += net
      productVat[item.itemName].vat   += vatAmt
      productVat[item.itemName].qty   += item.quantity ?? 0
    }))

    const rows = Object.entries(productVat).sort((a, b) => b[1].vat - a[1].vat).map(([name, d]) => `
      <tr>
        <td>${name}</td>
        <td class="td-right">${d.qty}</td>
        <td class="td-right amount">${bhd(d.gross)}</td>
        <td class="td-right">${bhd(d.net)}</td>
        <td class="td-right profit">${bhd(d.vat)}</td>
        <td class="td-right">${d.gross > 0 ? ((d.vat / d.gross) * 100).toFixed(1) : '0.0'}%</td>
      </tr>`).join('')

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card gold"> <div class="kpi-label">Gross Sales (incl. VAT)</div><div class="kpi-value gold">${bhd(totalGross)}</div></div>
        <div class="kpi-card">      <div class="kpi-label">Net Sales (excl. VAT)</div> <div class="kpi-value">${bhd(totalNet)}</div></div>
        <div class="kpi-card green"><div class="kpi-label">Total VAT Collected</div>   <div class="kpi-value green">${bhd(totalVat)}</div></div>
        <div class="kpi-card">      <div class="kpi-label">Effective VAT Rate</div>    <div class="kpi-value">${totalNet > 0 ? ((totalVat / totalNet) * 100).toFixed(1) : '0.0'}%</div></div>
      </div>
      <div class="section">
        <div class="section-title">VAT by Product</div>
        <table>
          <thead><tr><th>Product</th><th class="td-right">Units Sold</th><th class="td-right">Gross (incl. VAT)</th><th class="td-right">Net (excl. VAT)</th><th class="td-right">VAT Amount</th><th class="td-right">VAT Rate</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">No VAT data</td></tr>'}</tbody>
        </table>
      </div>`

    const subtitle = startDate && endDate ? `${fmtDate(startDate)} – ${fmtDate(endDate)}` : 'All time'
    const pdf = await htmlToPdf(htmlWrapper('VAT Report', subtitle, body))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="vat-report.pdf"' })
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate report.' })
  }
}

//  Inventory Report 
export const inventoryReport = async (req: Request, res: Response) => {
  try {
    const user: any  = req.session.user
    const products   = await Product.find({ businessID: user.businessId, active: true })
    const LOW        = 5
    let totalStock   = 0
    let lowCount     = 0

    const rows = products.map(p => {
      const stock = p.sizes?.length > 0
        ? p.sizes.reduce((s: number, sz: any) => s + (sz.stock ?? 0), 0)
        : (p.stock ?? 0)
      const isLow = stock <= LOW
      if (isLow) lowCount++
      totalStock += stock
      const sizeBreakdown = p.sizes?.length > 0
        ? p.sizes.map((sz: any) => `${sz.size}: ${sz.stock}`).join(', ')
        : '—'
      return `
        <tr>
          <td>${p.itemName}</td>
          <td>${p.category ?? '—'}</td>
          <td>${sizeBreakdown}</td>
          <td class="td-right ${isLow ? 'loss' : 'profit'}">${stock}</td>
          <td class="td-center">${isLow ? '<span style="color:#c0392b;font-weight:700">⚠ Low</span>' : '<span style="color:#2e7d32;font-weight:700">OK</span>'}</td>
        </tr>`
    }).join('')

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card">      <div class="kpi-label">Total Products</div>   <div class="kpi-value">${products.length}</div></div>
        <div class="kpi-card">      <div class="kpi-label">Total Stock Units</div><div class="kpi-value">${totalStock}</div></div>
        <div class="kpi-card red">  <div class="kpi-label">Low Stock Items</div>  <div class="kpi-value red">${lowCount}</div><div class="kpi-sub">≤ ${LOW} units</div></div>
        <div class="kpi-card green"><div class="kpi-label">Healthy Stock</div>    <div class="kpi-value green">${products.length - lowCount}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Stock Levels</div>
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Size Breakdown</th><th class="td-right">Total Stock</th><th class="td-center">Status</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">No products</td></tr>'}</tbody>
        </table>
      </div>`

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const pdf   = await htmlToPdf(htmlWrapper('Inventory Report', `As of ${today}`, body))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="inventory-report.pdf"' })
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate report.' })
  }
}

//  Payment Methods Report 
export const paymentMethodsReport = async (req: Request, res: Response) => {
  try {
    const user: any = req.session.user
    const { startDate, endDate } = req.body
    const sales = filterByDate(
      await Sales.find({ businessID: user.businessId }).sort({ date: -1 }),
      startDate, endDate,
    )

    const cashSales    = sales.filter(s => s.paymentMethod === 'Cash')
    const benefitSales = sales.filter(s => s.paymentMethod === 'BenefitPay')
    const cashRev      = cashSales.reduce((s, x) => s + x.totalSales, 0)
    const benefitRev   = benefitSales.reduce((s, x) => s + x.totalSales, 0)
    const total        = cashRev + benefitRev

    const rows = sales.map(s => `
      <tr>
        <td>${s.invoiceNumber}</td>
        <td>${fmtDate(String(s.date))}</td>
        <td>${s.customerName}</td>
        <td class="td-center"><span class="${s.paymentMethod === 'Cash' ? 'badge-cash' : 'badge-benefit'}">${s.paymentMethod}</span></td>
        <td class="td-right amount">${bhd(s.totalSales)}</td>
      </tr>`).join('')

    const body = `
      <div class="kpi-grid">
        <div class="kpi-card green"><div class="kpi-label">Cash Sales</div>        <div class="kpi-value green">${bhd(cashRev)}</div><div class="kpi-sub">${cashSales.length} transactions · ${total > 0 ? ((cashRev / total) * 100).toFixed(1) : 0}%</div></div>
        <div class="kpi-card">      <div class="kpi-label">BenefitPay Sales</div>  <div class="kpi-value">${bhd(benefitRev)}</div><div class="kpi-sub">${benefitSales.length} transactions · ${total > 0 ? ((benefitRev / total) * 100).toFixed(1) : 0}%</div></div>
        <div class="kpi-card gold"> <div class="kpi-label">Total Revenue</div>     <div class="kpi-value gold">${bhd(total)}</div></div>
        <div class="kpi-card">      <div class="kpi-label">Total Transactions</div><div class="kpi-value">${sales.length}</div></div>
      </div>
      <div class="section">
        <div class="section-title">All Transactions</div>
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="td-center">Payment</th><th class="td-right">Amount</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">No transactions</td></tr>'}</tbody>
        </table>
      </div>`

    const subtitle = startDate && endDate ? `${fmtDate(startDate)} – ${fmtDate(endDate)}` : 'All time'
    const pdf = await htmlToPdf(htmlWrapper('Payment Methods Report', subtitle, body))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="payment-methods.pdf"' })
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate report.' })
  }
}

//  AI Custom Report 
export const aiCustomReport = async (req: Request, res: Response) => {
  try {
    const user: any = req.session.user
    const { prompt } = req.body
    if (!prompt) return res.status(400).json({ message: 'Prompt is required.' })

    const [sales, expenses] = await Promise.all([
      Sales.find({ businessID: user.businessId }),
      Expenses.find({ businessID: user.businessId }),
    ])

    const totalRevenue  = sales.reduce((s, x) => s + x.totalSales,  0)
    const totalNetSales = sales.reduce((s, x) => s + (x.totalNetSales ?? x.totalSales), 0)
    const totalVat      = sales.reduce((s, x) => s + (x.totalVat ?? 0), 0)
    const totalCost     = sales.reduce((s, x) => s + x.totalCost,   0)
    const grossProfit   = sales.reduce((s, x) => s + x.grossProfit, 0)
    const totalExpenses = expenses.reduce((s, x) => s + x.amount,   0)

    const pm: Record<string, { revenue: number; qty: number }> = {}
    sales.forEach(sale => sale.items.forEach((item: any) => {
      if (!pm[item.itemName]) pm[item.itemName] = { revenue: 0, qty: 0 }
      pm[item.itemName].revenue += item.itemTotalPrice ?? 0
      pm[item.itemName].qty     += item.quantity       ?? 0
    }))

    const mm: Record<string, { revenue: number; profit: number; expenses: number }> = {}
    sales.forEach(s => {
      const key = new Date(s.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      if (!mm[key]) mm[key] = { revenue: 0, profit: 0, expenses: 0 }
      mm[key].revenue += s.totalSales
      mm[key].profit  += s.grossProfit
    })
    expenses.forEach(e => {
      const key = new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      if (!mm[key]) mm[key] = { revenue: 0, profit: 0, expenses: 0 }
      mm[key].expenses += e.amount
    })

    const context = `
Business Data:
- Transactions: ${sales.length}, Revenue (incl. VAT): BHD ${totalRevenue.toFixed(3)}, Net Revenue (excl. VAT): BHD ${totalNetSales.toFixed(3)}, VAT Collected: BHD ${totalVat.toFixed(3)}, COGS: BHD ${totalCost.toFixed(3)}, Gross Profit: BHD ${grossProfit.toFixed(3)}, Expenses: BHD ${totalExpenses.toFixed(3)}, Net Profit: BHD ${(grossProfit - totalExpenses).toFixed(3)}
- Products: ${Object.entries(pm).sort((a, b) => b[1].revenue - a[1].revenue).map(([n, d]) => `${n}: BHD ${d.revenue.toFixed(3)}, ${d.qty} units`).join('; ')}
- Monthly: ${Object.entries(mm).map(([m, d]) => `${m}: Revenue BHD ${d.revenue.toFixed(3)}, Profit BHD ${d.profit.toFixed(3)}, Expenses BHD ${d.expenses.toFixed(3)}`).join('; ')}
- Expense Categories: ${[...new Set(expenses.map(e => e.category))].join(', ')}
- Payment: ${sales.filter(s => s.paymentMethod === 'Cash').length} Cash, ${sales.filter(s => s.paymentMethod === 'BenefitPay').length} BenefitPay
- All amounts in Bahraini Dinar (BHD). Profit is calculated on net revenue (excl. VAT).`.trim()

    const aiRes  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are a business report generator. Based on the business data below, generate an HTML report for this request: "${prompt}"

Business Data:
${context}

Rules:
- Output ONLY the HTML body content (no <html>, <head>, <body> tags)
- Output ONLY raw HTML, no markdown, no \`\`\`html, no \`\`\` fences of any kind
- Use only: <h2>, <h3>, <p>, <ul>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <strong>, <br>
- For tables use class="td-right" on right-aligned cells
- For amounts use class="amount" (gold), profits use class="profit" (green), losses use class="loss" (red)
- All amounts in BHD format: BHD X.XXX
- Be specific with real numbers from the data
- Structure: title section → key findings → detailed analysis → recommendations
- Wrap everything in <div class="ai-body">...</div>`,
        }],
      }),
    })

    const aiData = await aiRes.json()
    const rawHtml = aiData.content?.map((c: any) => c.text).join('') ?? '<p>Could not generate report.</p>'
    const aiHtml = rawHtml
  .replace(/^```html\s*/i, "")
  .replace(/^```\s*/i, "")
  .replace(/```\s*$/i, "")
  .trim()
    const pdf    = await htmlToPdf(htmlWrapper(
      'Custom AI Report',
      `Generated from: "${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`,
      aiHtml,
    ))
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="custom-report.pdf"' })
    res.send(pdf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Failed to generate AI report.' })
  }
}