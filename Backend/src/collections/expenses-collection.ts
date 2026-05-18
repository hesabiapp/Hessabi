import { Schema, model } from "mongoose";

const expenses = new Schema(
    {
        businessID: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
        date: { type: Date, required: true },
        category: {
            type: String,
            enum: ['salary', 'rent', 'utilities', 'delivery', 'marketing', 'maintenance', 'supplies'],
            required: true
        },
        amount: { type: Number, required: true },
        description: { type: String, required: true },
        createdBy: { type: String, required: true },
        
    },
    { timestamps: true }
    
);

export default model('Expenses', expenses, 'expenses')