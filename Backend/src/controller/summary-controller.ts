import { Request, Response } from "express";
import Expenses from "../collections/expenses-collection.js";
import Sales from "../collections/sales-collection.js";
import { summaryCalculation } from "../function/summaryCalculation.js";


export const getSummary = async (req: Request, res: Response) => {
    const user: any = req.user;
    const sales = await Sales.find({ businessID: user.businessId })
    const expenses = await Expenses.find({ businessID: user.businessId })
    const summary = summaryCalculation(sales, expenses)
    return res.status(200).send({ message: 'Summary results.', summary })
}
