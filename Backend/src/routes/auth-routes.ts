import {
    login,
    signup,
    viewUser,
    createUsers,
    editUsers,
    viewUsers,
    deleteUsers,
    logout
} from "../controller/auth-controller.js";
import { Router } from "express";
import { auth, adminRequire } from "../middleware/auth.js";

const router = Router();

router.post('/signup', signup)
router.post('/login', login)
router.get('/viewUser', auth, viewUser)
router.post('/createUsers', auth, adminRequire, createUsers)
router.put('/editUsers', auth, adminRequire, editUsers)
router.get('/viewUsers', auth, adminRequire, viewUsers)
router.delete('/deleteUsers', auth, adminRequire, deleteUsers)
router.post('/logout', auth, logout)

export default router;

