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
import { adminAuth, adminJwtAuth } from "../middleware/adminAuth.js";
import { auth } from "../middleware/auth.js";

const router = Router();

// Super admin routes 
router.get("/",       adminJwtAuth,adminAuth, getAllSubscriptions);
router.post("/",      adminJwtAuth,adminAuth, upsertSubscription);
router.put("/extend", adminJwtAuth,adminAuth, extendSubscription);
router.put("/pay",    adminJwtAuth,adminAuth, recordPayment);

// Business owner routes 
router.get("/me",     auth, getMySubscription);
router.post("/me",    auth, upsertSubscription);
router.post("/charge", auth, createTapCharge);
router.post("/verify", auth, verifyTapPayment);
router.post("/demo-activate", auth, demoActivate);


export default router;