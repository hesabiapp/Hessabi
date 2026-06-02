import { Router } from "express";
import { getAllSubscriptions,getBusinessProfile } from "../controller/admin-controller.js";
import {upsertSubscription, extendSubscription, recordPayment,} from "../controller/subscription-controller.js";

import { adminLogin, adminLogout, createAdmin, getAllBusinesses, getSystemStats, getAllUsers, toggleUserStatus} from "../controller/admin-controller.js";
import { adminAuth, adminJwtAuth } from "../middleware/adminAuth.js";
import { auth } from "../middleware/auth.js";
import { changeAdminPassword } from "../controller/admin-controller.js";

const router = Router();


router.post('/login', adminLogin);
router.post('/create', createAdmin); 


router.post('/logout',              adminJwtAuth, adminAuth, adminLogout);
router.get('/businesses',           adminJwtAuth, adminAuth, getAllBusinesses);
router.get('/stats',                adminJwtAuth, adminAuth, getSystemStats);
router.get('/users',                adminJwtAuth, adminAuth, getAllUsers);
router.put('/toggleUser',           adminJwtAuth, adminAuth, toggleUserStatus);
router.get('/subscriptions',        adminJwtAuth, adminAuth, getAllSubscriptions);
router.post('/subscription',        adminJwtAuth, adminAuth, upsertSubscription);
router.get('/business/:businessId', adminJwtAuth, adminAuth, getBusinessProfile);
router.put('/change-password',      adminJwtAuth, adminAuth, changeAdminPassword);
export default router;
