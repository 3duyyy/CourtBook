import { Router } from 'express'
import { authRoutes } from '../modules/auth/auth.route'
import { ownerRoute } from '../modules/facilities/facilities.route'
import { publicFacilitiesRoutes } from '../modules/facilities/facilities.public.route'
import { sportsRoutes } from '../modules/sports/sports.route'
import { utilitiesRoutes } from '../modules/utilities/utilities.route'
import { adminRoutes } from '../modules/admin/admin.route'
import { usersRoute } from '../modules/users/users.route'
import { bookingsRoutes } from '../modules/bookings/bookings.route'
import { uploadRoute } from '../modules/upload/upload.route'
import { reviewsRoute } from '../modules/reviews/reviews.route'
import { paymentsRoutes } from '../modules/payments/payments.route'
import { chatbotRoutes } from '../modules/chatbot/chatbot.route'

const router = Router()

router.use('/auth', authRoutes)
router.use('/owner', ownerRoute)
router.use('/facilities', publicFacilitiesRoutes)
router.use('/sports', sportsRoutes)
router.use('/utilities', utilitiesRoutes)
router.use('/admin', adminRoutes)
router.use('/users', usersRoute)
router.use('/bookings', bookingsRoutes)
router.use('/upload', uploadRoute)
router.use('/reviews', reviewsRoute)
router.use('/payments', paymentsRoutes)
router.use('/chatbot', chatbotRoutes)

export const api = router
