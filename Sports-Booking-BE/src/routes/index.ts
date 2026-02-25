import { Router } from 'express'
import { authRoutes } from '../modules/auth/auth.route'
import { ownerRoute } from '../modules/facilities/facilities.route'
import { publicFacilitiesRoutes } from '../modules/facilities/facilities.public.route'

const router = Router()

router.use('/auth', authRoutes)
router.use('/owner', ownerRoute)
router.use('/facilities', publicFacilitiesRoutes)

export const api = router
