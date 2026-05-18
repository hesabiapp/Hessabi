import { addExpenses, importExpenses, viewExpense, viewExpenses, deleteExpense } from "../controller/expenses-controller.js";
import { auth } from "../middleware/auth.js";
import { Router } from "express";
import { mapHeaders } from "../controller/mapHeaders.js";

const router = Router();

router.post('/addExpenses', auth, addExpenses);
router.post('/viewExpense', auth, viewExpense);
router.get('/viewExpenses', auth, viewExpenses);
router.post('/mapHeaders', auth, mapHeaders);
router.post('/importExpenses', auth, importExpenses);
router.delete('/deleteExpense', auth, deleteExpense);

export default router;