import { getSummary } from "../controller/summary-controller.js";
import { auth } from "../middleware/auth.js";
import { Router } from "express";

const router = Router();

router.get('/getSummary', auth, getSummary);

export default router;