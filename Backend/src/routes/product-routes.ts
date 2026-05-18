import { addProduct, editProduct, viewProducts, viewProduct, deleteProduct } from "../controller/product-controller.js";
import { auth } from "../middleware/auth.js";
import upload from "../config/multer.js";
import { Router } from "express";

const router = Router();

router.post('/addProduct', auth, upload.single('photo'), addProduct);
router.put('/editProduct', auth, upload.single('photo'), editProduct);
router.get('/viewProducts', auth, viewProducts);
router.post('/viewProduct', auth, viewProduct);
router.delete('/deleteProduct', auth, deleteProduct);

export default router;