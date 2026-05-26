import { mapHeaders } from "../controller/mapHeaders.js";
import { addSales, viewSales, viewSale, importSales, deleteSale, getNextInvoiceNumber } from "../controller/sales-controller.js";
import { auth } from "../middleware/auth.js";
import { Router } from "express";

const router = Router();

router.post('/addSales', auth, addSales);
router.get('/viewSales', auth, viewSales);
router.post('/viewSale', auth, viewSale);
router.post('/importSales', auth, importSales);
router.post('/mapHeaders', auth, mapHeaders);
router.delete('/deleteSale', auth, deleteSale);
router.get('/nextInvoiceNumber', auth, getNextInvoiceNumber)

export default router;