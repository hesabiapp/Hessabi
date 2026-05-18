import { Router } from 'express'
import { getInsight, chat } from '../controller/Ai-controller.js'
import { auth } from '../middleware/auth.js'

const router = Router()

router.post('/insight', auth, getInsight)
router.post('/chat',    auth, chat)

export default router


