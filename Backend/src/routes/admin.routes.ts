import { Router } from "express";
import { getAllSubscriptions,getBusinessProfile } from "../controller/admin-controller.js";
import {
  upsertSubscription,  
  extendSubscription,
  recordPayment,
} from "../controller/subscription-controller.js";

import {
    adminLogin,
    adminLogout,
    createAdmin,
    getAllBusinesses,
    getSystemStats,
    getAllUsers,
    toggleUserStatus
} from "../controller/admin-controller.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();


router.post('/login', adminLogin);
router.post('/create', createAdmin); 


router.post('/logout', adminAuth, adminLogout);
router.get('/businesses', adminAuth, getAllBusinesses);
router.get('/stats', adminAuth, getSystemStats);
router.get('/users', adminAuth, getAllUsers);
router.put('/toggleUser', adminAuth, toggleUserStatus);
router.get('/subscriptions', adminAuth, getAllSubscriptions);
router.post('/subscription', adminAuth, upsertSubscription);       
router.get('/business/:businessId', adminAuth, getBusinessProfile); 
export default router;
