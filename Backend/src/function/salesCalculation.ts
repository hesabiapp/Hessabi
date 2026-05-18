
interface SalesItem {
    productId: string;
    itemName: string;
    color: string;
    size: string;
    quantity: number;
    unitPrice: number; // This is the TOTAL selling price (incl VAT) — customer facing price
}

export const salesCalculation = (items: SalesItem[], product: any[]) => {

    const sales = items.map((item, index) => {
        const vatRate = product[index].vatRate ?? 0;

        // unitPrice = total price incl. VAT (what customer pays)
        const netUnitPrice   = item.unitPrice / (1 + vatRate / 100);
        const vatUnitAmount  = item.unitPrice - netUnitPrice;

        
        const itemTotalPrice = item.unitPrice * item.quantity;         // total incl. VAT
        const itemNetPrice   = netUnitPrice   * item.quantity;         // total excl. VAT
        const itemVatAmount  = vatUnitAmount  * item.quantity;         // VAT 
        const itemTotalCost  = product[index].costPrice * item.quantity; // cost

        return {
            productId:      item.productId,
            itemName:       product[index].itemName,
            color:          product[index].color,
            size:           item.size,
            quantity:       item.quantity,
            vatRate:        vatRate,
            unitPrice:      item.unitPrice,        // total incl. VAT per unit
            unitCost:       product[index].costPrice,
            itemTotalPrice: itemTotalPrice,        // total incl. VAT
            itemNetPrice:   itemNetPrice,          // total excl. VAT
            itemVatAmount:  itemVatAmount,         // VAT 
            itemTotalCost:  itemTotalCost,
        };
    });

    // Sum up totals
    let totalSales    = 0; // total revenue incl. VAT
    let totalNetSales = 0; // total revenue excl. VAT
    let totalVat      = 0; // total VAT collected
    let totalCost     = 0; // total cost of goods

    sales.forEach((sale) => {
        totalSales    += sale.itemTotalPrice;
        totalNetSales += sale.itemNetPrice;
        totalVat      += sale.itemVatAmount;
        totalCost     += sale.itemTotalCost;
    });

    
    const grossProfit = totalNetSales - totalCost;

    return { sales, totalSales, totalNetSales, totalVat, totalCost, grossProfit };
};