import { Router } from 'express'
import { auth } from '../middleware/auth.js'
import {
  salesSummaryReport,
  profitLossReport,
  topProductsReport,
  expensesBreakdownReport,
  vatReport,
  inventoryReport,
  paymentMethodsReport,
  aiCustomReport,
} from '../controller/report-controller.js'

const router = Router()

router.post('/sales-summary',       auth, salesSummaryReport)
router.post('/profit-loss',         auth, profitLossReport)
router.post('/top-products',        auth, topProductsReport)
router.post('/expenses-breakdown',  auth, expensesBreakdownReport)
router.post('/vat-report',          auth, vatReport)
router.post('/inventory-report',    auth, inventoryReport)
router.post('/payment-methods',     auth, paymentMethodsReport)
router.post('/ai-custom',           auth, aiCustomReport)

export default router

