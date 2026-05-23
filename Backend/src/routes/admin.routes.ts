import { Router } from "express";
import { getAllSubscriptions,getBusinessProfile } from "../controller/admin-controller.js";
import {upsertSubscription, extendSubscription, recordPayment,} from "../controller/subscription-controller.js";

import { adminLogin, adminLogout, createAdmin, getAllBusinesses, getSystemStats, getAllUsers, toggleUserStatus} from "../controller/admin-controller.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { auth } from "../middleware/auth.js";
import { changeAdminPassword } from "../controller/admin-controller.js";

const router = Router();


router.post('/login', adminLogin);
router.post('/create', createAdmin); 


router.post('/logout',              auth, adminAuth, adminLogout);
router.get('/businesses',           auth, adminAuth, getAllBusinesses);
router.get('/stats',                auth, adminAuth, getSystemStats);
router.get('/users',                auth, adminAuth, getAllUsers);
router.put('/toggleUser',           auth, adminAuth, toggleUserStatus);
router.get('/subscriptions',        auth, adminAuth, getAllSubscriptions);
router.post('/subscription',        auth, adminAuth, upsertSubscription);
router.get('/business/:businessId', auth, adminAuth, getBusinessProfile);
router.put('/change-password',      auth, adminAuth, changeAdminPassword);
export default router;
