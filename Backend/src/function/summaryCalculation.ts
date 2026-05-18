export const summaryCalculation = (sales: any[], expenses: any[]) => {
    let totalSales = 0;
    let totalCost = 0;
    let grossProfit = 0;

    sales.forEach((item) => {
        totalSales += item.totalSales;
        totalCost += item.totalCost;
        grossProfit += item.grossProfit;
    })

    let totalExpenses = 0;

    expenses.forEach((item) => {
        totalExpenses += item.amount;
    })

    const netProfit = grossProfit - totalExpenses;

    return { totalSales, totalCost, grossProfit, totalExpenses, netProfit };
}