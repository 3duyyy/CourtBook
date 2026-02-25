import { Router } from 'express'
import { FacilitiesController } from './facilities.controller'

const router = Router()

router.get('/', FacilitiesController.getPublicFacilities)
router.get('/:id', FacilitiesController.getPublicFacilityById)
router.get('/:id/reviews', FacilitiesController.getFacilityReviews)
router.get('/:id/availability', FacilitiesController.getFacilityAvailability)

export const publicFacilitiesRoutes = router
