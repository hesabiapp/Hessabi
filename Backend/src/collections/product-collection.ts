import { Schema, model } from "mongoose";

const product = new Schema(
    {
        businessID: { type: Schema.Types.ObjectId, required: true },
        itemName: { type: String, required: true },
        category: { type: String, required: true },
        color: { type: String, required: true },
        costPrice: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        vatRate: { type: Number, default: 10 },
        description: { type: String, required: true },
        stock: { type: Number, required: true, default: 0 },
        sizes: [{
            size: { type: String, required: true },
            stock: { type: Number, required: true },
            _id: false
        }],
        photo: { type: String, default: null },
        active: { type: Boolean, default: true }
    },
    { timestamps: true }
);

export default model('Product', product, 'products');
