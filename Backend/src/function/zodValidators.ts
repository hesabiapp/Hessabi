import { z } from "zod";

export const validateSignUp = z.object({
    username: z.string().min(1, 'Username is required').max(20, 'Username is too long'),
    Fname: z.string().min(1, 'First name is required').max(20, 'First name is too long'),
    Lname: z.string().min(1, 'Last name is required').max(20, 'Last name is too long'),
    email: z.string().email('Wrong email format'),
    password: z.string().min(8, 'Password must be at least 8 characters long').max(30, 'Password is long')
})

export const validateLogin = z.object({
    username: z.string().min(1, 'Username is required').max(20, 'Username is too long'),
    password: z.string().min(8, 'Password must be at least 8 characters long').max(30, 'Password is long')
})

export const validateProduct = z.object({
    itemName: z.string().min(1, 'Item name is required').max(50, 'Item name is too long'),
    category: z.string().min(1, 'Category is required').max(30, 'Category is too long'),
    color: z.string().min(1, 'Color is required').max(20, 'Color is too long'),
    costPrice: z.string().min(0, 'Cost price must be a positive number'),
    sellingPrice: z.string().min(0, 'Selling price must be a positive number'),
    description: z.string().max(255, 'Description is too long'),
    stock: z.coerce.number().min(0, 'Stock must be a positive number'),
    sizes: z.array(z.object({
        size: z.string().min(1, 'Size is required').max(5, 'Size is too long'),
        stock: z.number().min(0, 'Stock must be a positive number')
    })).optional(),
    photo: z.string().optional(),
    active: z.boolean().default(true)
})

export const validateSales = z.object({
    invoiceNumber: z.string().min(1, 'Invoice number is required').max(50, 'Invoice number is too long'),
    date: z.string().min(1, 'Date is required'),
    customerName: z.string().min(1, 'Customer name is required').max(50, 'Customer name is too long'),
    items: z.array(z.object({
        productId: z.string().min(1, 'Product ID is required'),
        size: z.string().max(10, 'Size is too long').optional().default(''),
        quantity: z.number().min(0, 'Quantity must be positive number'),
        unitPrice: z.number().min(0, 'Unit price must be positive number'),
        unitCost: z.number().min(0, 'Unit cost must be positive number'),
        itemTotalPrice: z.number().min(0, 'Item total price must be positive number'),
        itemTotalCost: z.number().min(0, 'Item total cost must be positive number')
    })).min(1, 'At least one item is required'),
    totalSales: z.number().min(0, 'Total sales must be positive number'),
    totalCost: z.number().min(0, 'Total cost must be positive number'),
    grossProfit: z.number(),
    paymentMethod: z.enum(['Cash', 'BenefitPay'], { message: 'Payment method must be cash or BenefitPay' }),
    source: z.enum(['manual', 'excel'], { message: 'Source must be either manual or excel' }),
    createdBy: z.string().min(1, 'Created by is required')
})

export const valExpense = z.object({
    date: z.string().min(1, 'Date is required'),
    category: z.string().min(1, 'Category is required').max(30, 'Category is too long'),
    amount: z.number().min(0, 'Amount must be positive number'),
    description: z.string().min(1, 'Description is required').max(255, 'Description is too long'),
    createdBy: z.string().min(1, 'Created by is required')
})