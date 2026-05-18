import { Schema, model } from "mongoose";

const sales = new Schema(
    {
        businessID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
        invoiceNumber: { type: String, required: true, unique: true },
        date: { type: Date, required: true },
        customerName: { type: String, required: true },
        paymentMethod: { type: String, required: true, enum: ['Cash', 'BenefitPay'] },
        items: [{
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            itemName: { type: String, required: true },
            color: { type: String, required: true },
            size: { type: String, required: false, default: '' },
            quantity: { type: Number, required: true },
            vatRate: { type: Number, default: 10 },
            unitPrice: { type: Number, required: true },       
            unitCost: { type: Number, required: true },
            itemTotalPrice: { type: Number, required: true },  
            itemNetPrice: { type: Number, required: true },    
            itemVatAmount: { type: Number, required: true },   
            itemTotalCost: { type: Number, required: true },
            _id: false
        }],
        totalSales: { type: Number, required: true },          
        totalNetSales: { type: Number, required: true },       
        totalVat: { type: Number, required: true },            
        totalCost: { type: Number, required: true },
        grossProfit: { type: Number, required: true },
        source: { type: String, required: true, enum: ['manual', 'excel'] },
        createdBy: { type: String, required: true }
    },
    { timestamps: true }
);

export default model('Sales', sales, 'sales');