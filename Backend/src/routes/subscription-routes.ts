import { Router } from "express";
import {
  getAllSubscriptions,
  upsertSubscription,
  extendSubscription,
  recordPayment,
  getMySubscription,
  createTapCharge,
  verifyTapPayment,
  demoActivate,
} from "../controller/subscription-controller.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { auth } from "../middleware/auth.js";

const router = Router();

// Super admin routes 
router.get("/",       adminAuth, getAllSubscriptions);
router.post("/",      adminAuth, upsertSubscription);
router.put("/extend", adminAuth, extendSubscription);
router.put("/pay",    adminAuth, recordPayment);

// Business owner routes 
router.get("/me",     auth, getMySubscription);
router.post("/me",    auth, upsertSubscription);
router.post("/charge", auth, createTapCharge);
router.post("/verify", auth, verifyTapPayment);
router.post("/demo-activate", auth, demoActivate);


export default router;