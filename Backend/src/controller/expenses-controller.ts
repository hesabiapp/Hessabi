import { Request, Response } from "express";
import Expenses from "../collections/expenses-collection.js";
import { valExpense } from "../function/zodValidators.js";

export const addExpenses = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(404).json({ message: 'input is required.' })
    }

    const { date, category, amount, description } = req.body
    const user: any = req.session.user
    const createdBy = user.username

    const valExpenseR = valExpense.safeParse({ date, category, amount, description, createdBy })
    if (!valExpenseR.success) {
        const error = valExpenseR.error.issues[0]
        return res.status(400).send({ input: error.path, message: error.message })
    }

    const addExpenses = await Expenses.create({
        businessID: user.businessId,
        date, category, amount, description, createdBy
    })

    return res.status(200).send({
        message: 'Expenses added successfully',
        _id: addExpenses._id,
        date: addExpenses.date,
        category: addExpenses.category,
        amount: addExpenses.amount,
        description: addExpenses.description,
        createdBy: addExpenses.createdBy,
    })
}

export const viewExpense = async (req: Request, res: Response) => {
    if (!req.body) {
        return res.status(404).json({ message: 'input is required.' })
    }

    const { expensesId } = req.body
    const viewExpense = await Expenses.findById(expensesId)
    if (!viewExpense) {
        return res.status(404).json({ message: 'Expense is not found.' })
    }

    return res.status(200).send({
        message: 'Expenses is found.',
        _id: viewExpense._id,
        date: viewExpense.date,
        category: viewExpense.category,
        amount: viewExpense.amount,
        description: viewExpense.description,
        createdBy: viewExpense.createdBy,
    })
}

export const viewExpenses = async (req: Request, res: Response) => {
    const user: any = req.session.user;
    const viewExpenses = await Expenses.find({ businessID: user.businessId })

    if (viewExpenses.length === 0) {
        return res.status(200).json({ message: 'No expenses found.', expenses: [] })
    }

    const expenses = viewExpenses.map((expense) => ({
        _id: expense._id,
        date: expense.date,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        createdBy: expense.createdBy
    }))

    return res.status(200).send({ message: 'Expenses is found.', expenses })
}

export const deleteExpense = async (req: Request, res: Response) => {
    try {
        const { expenseId } = req.body;
        if (!expenseId) return res.status(400).json({ message: 'Expense ID is required.' });

        const deleted = await Expenses.findByIdAndDelete(expenseId);
        if (!deleted) return res.status(404).json({ message: 'Expense not found.' });

        return res.status(200).json({ message: 'Expense deleted successfully.' });
    } catch (err) {
        
        return res.status(500).json({ message: 'Server error', error: err });
    }
}

const parseExcelDate = (date: any): Date | null => {
    if (typeof date === "number") {
        const parsed = new Date(Math.round((date - 25569) * 864e5));
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof date === "string") {
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

export const importExpenses = async (req: Request, res: Response) => {
    const user: any = req.session.user;
    const { rows } = req.body;
    const results: { description: string; status: string; message?: string }[] = [];

    for (const row of rows) {
        const { date, category, amount, description } = row;

        const parsedDate = parseExcelDate(date);
        if (!parsedDate) {
            results.push({ description, status: "error", message: "Invalid date format." });
            continue;
        }

        const duplicate = await Expenses.findOne({
            businessID: user.businessId,
            date: parsedDate,
            category,
            amount: Number(amount),
            description
        });

        if (duplicate) {
            results.push({ description, status: "skipped", message: "Expense already exists." });
            continue;
        }

        try {
            await Expenses.create({
                businessID: user.businessId,
                date: parsedDate,
                category,
                amount: Number(amount),
                description,
                createdBy: user.username
            });
            results.push({ description, status: "success" });
        } catch (err) {
             
            results.push({ description, status: "error", message: "Failed to save." });
        }
    }

    return res.status(200).json({ results });
};