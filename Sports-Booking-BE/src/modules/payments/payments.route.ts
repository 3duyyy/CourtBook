import { Router } from 'express'
import { PaymentsController } from './payments.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

router.post('/payos-webhook', PaymentsController.payosWebhook)
router.get('/result', authMiddleware, PaymentsController.getPaymentResult)
router.patch('/cancel', authMiddleware, PaymentsController.cancelPayment)

export const paymentsRoutes = router
