import { Request, Response } from "express";
import { validateProduct } from "../function/zodValidators.js";
import Product from "../collections/product-collection.js";
import mongoose from "mongoose";

const buildPhotoUrl = (req: Request, photo: string | null | undefined): string | null => {
    if (!photo || photo === 'null') return null;
    if (photo.startsWith('http')) return photo;
    return `${req.protocol}://${req.get("host")}/${photo.replace(/\\/g, '/')}`;
};
//add, edit, view, delete product
export const addProduct = async (req: Request, res: Response) => {
    try {
        if (!req.body) {
            return res.status(404).json({ message: 'input is required.' })
        }

        const user: any = req.session.user;
        const { itemName, category, color, costPrice, sellingPrice, vatRate, description, stock } = req.body;
        const sizes = req.body.sizes ? JSON.parse(req.body.sizes) : undefined;
        const photo = req.file ? `productsImages/${req.file.filename}` : (req.body.photo ?? null);

        const productVal = validateProduct.safeParse({ itemName, category, color, costPrice, sellingPrice, vatRate, description, stock, sizes, photo });
        if (!productVal.success) {
            const error = productVal.error.issues[0];
            console.log("ZOD ERROR:", error);
            return res.status(400).send({ input: error.path, message: error.message });
        }

        const newProduct = await Product.create({
            businessID: new mongoose.Types.ObjectId(user.businessId),
            itemName, category, color, costPrice, sellingPrice,
            vatRate: vatRate ?? 0,
            description, stock, sizes,
            photo: photo && photo !== 'null' ? photo : null
        });

        return res.status(200).json({
            message: "Product is created",
            product: {
                productId: newProduct._id,
                itemName: newProduct.itemName,
                category: newProduct.category,
                color: newProduct.color,
                costPrice: newProduct.costPrice,
                sellingPrice: newProduct.sellingPrice,
                vatRate: newProduct.vatRate,
                description: newProduct.description,
                stock: newProduct.stock,
                sizes: newProduct.sizes,
                photo: newProduct.photo,
                active: newProduct.active,
                photoUrl: buildPhotoUrl(req, newProduct.photo)
            }
        });

    } catch (err) {
        return res.status(500).json({ message: 'Server error', error: err });
    }
};

export const editProduct = async (req: Request, res: Response) => {
    try {
        if (!req.body) {
            return res.status(404).json({ message: 'input is required.' })
        }

        const { productId, itemName, category, color, costPrice, sellingPrice, vatRate, description, stock, active } = req.body;
        const sizes = req.body.sizes ? JSON.parse(req.body.sizes) : undefined;
        const photo = req.file ? `productsImages/${req.file.filename}` : (req.body.photo && req.body.photo !== 'null' ? req.body.photo : undefined);

        const bodyData: any = {};
        if (itemName) bodyData.itemName = itemName;
        if (category) bodyData.category = category;
        if (color) bodyData.color = color;
        if (costPrice) bodyData.costPrice = costPrice;
        if (sellingPrice) bodyData.sellingPrice = sellingPrice;
        if (typeof vatRate !== "undefined") bodyData.vatRate = Number(vatRate);
        if (description) bodyData.description = description;
        if (sizes) bodyData.sizes = sizes;
        if (photo) bodyData.photo = photo;
        if (typeof stock !== "undefined") bodyData.stock = Number(stock);
        if (typeof active !== "undefined") bodyData.active = JSON.parse(active);

        const product = await Product.findByIdAndUpdate(
            { _id: productId },
            bodyData,
            { returnDocument: "after" }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product is not found.' });
        }

        return res.status(200).json({
            message: 'Product updated successfully.',
            productId: product._id,
            itemName: product.itemName,
            category: product.category,
            color: product.color,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            vatRate: product.vatRate,
            description: product.description,
            stock: product.stock,
            sizes: product.sizes,
            photo: product.photo,
            active: product.active,
            photoUrl: buildPhotoUrl(req, product.photo)
        });

    } catch (err) {
       
        return res.status(500).json({ message: 'Server error', error: err });
    }
};

export const viewProducts = async (req: Request, res: Response) => {
    try {
        const user: any = req.session.user;
        const products = await Product.find({ businessID: new mongoose.Types.ObjectId(user.businessId) });

        const viewedProductsR = products.map((product) => ({
            productId: product._id,
            itemName: product.itemName,
            category: product.category,
            color: product.color,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            vatRate: product.vatRate,
            description: product.description,
            stock: product.stock,
            sizes: product.sizes,
            photo: product.photo,
            active: product.active,
            photoUrl: buildPhotoUrl(req, product.photo)
        }));

        return res.status(200).json({ message: 'Products found.', products: viewedProductsR });

    } catch (err) {
       
        return res.status(500).json({ message: 'Server error', error: err });
    }
};

export const viewProduct = async (req: Request, res: Response) => {
    try {
        if (!req.body) {
            return res.status(404).json({ message: 'input is required.' })
        }

        const { productId } = req.body;
        const product = await Product.findOne({ _id: productId });

        if (!product) {
            return res.status(404).json({ message: 'Product is not found.' });
        }

        return res.status(200).json({
            message: 'Product is found.',
            productId: product._id,
            itemName: product.itemName,
            category: product.category,
            color: product.color,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            vatRate: product.vatRate,
            description: product.description,
            stock: product.stock,
            sizes: product.sizes,
            photo: product.photo,
            active: product.active,
            photoUrl: buildPhotoUrl(req, product.photo)
        });

    } catch (err) {
        
        return res.status(500).json({ message: 'Server error', error: err });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { productId } = req.body;
        const deleted = await Product.findByIdAndDelete({ _id: productId });

        if (!deleted) return res.status(404).json({ message: 'Product is not found.' });
        return res.status(200).json({ message: 'Product deleted.' });

    } catch (err) {
        
        return res.status(500).json({ message: 'Server error', error: err });
    }
};
