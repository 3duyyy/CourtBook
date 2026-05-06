import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { AuthorizationMiddleware } from '../../middlewares/authorization.middleware'
import { validationMiddleware } from '../../middlewares/validation.middleware'
import {
  CreateFacilityDto,
  CreateFieldDto,
  OwnerCompleteCheckInDto,
  SetFieldPricesDto,
  UpdateFacilityDto,
  UpdateFieldDto
} from '../../dtos/facilities.dto'
import { FacilitiesController } from './facilities.controller'
import { ROLES } from '../../shared/constants/roles'
import { ReviewsController } from '../reviews/reviews.controller'
import { OwnerReplyReviewDto } from '../../dtos/reviews.dto'

const router = Router()

router.use(authMiddleware, AuthorizationMiddleware.roles(ROLES.OWNER, ROLES.CUSTOMER))

router.get('/facilities', FacilitiesController.getMyFacilities)
router.post('/facilities', validationMiddleware(CreateFacilityDto), FacilitiesController.createFacility)
router.get('/facilities/:facilityId', FacilitiesController.getOwnerFacilityDetail)
router.patch('/facilities/:facilityId', validationMiddleware(UpdateFacilityDto), FacilitiesController.updateOwnerFacility)
router.delete('/facilities/:facilityId', FacilitiesController.deleteOwnerFacility)

router.post('/facilities/:facilityId/fields', validationMiddleware(CreateFieldDto), FacilitiesController.createField)
router.patch('/fields/:fieldId', validationMiddleware(UpdateFieldDto), FacilitiesController.updateField)
router.delete('/fields/:fieldId', FacilitiesController.deleteField)
router.get('/fields/:fieldId/prices', FacilitiesController.getFieldPrices)
router.put('/fields/:fieldId/prices', validationMiddleware(SetFieldPricesDto), FacilitiesController.setFieldPrices)

router.get('/overview', AuthorizationMiddleware.ownerOnly(), FacilitiesController.getOwnerOverview)
router.get('/calendar', FacilitiesController.getOwnerCalendar)
router.get('/check-in/search', FacilitiesController.searchOwnerCheckInBooking)
router.get('/check-in/history', FacilitiesController.getOwnerCheckInHistory)
router.patch('/check-in/:bookingId/complete', validationMiddleware(OwnerCompleteCheckInDto), FacilitiesController.completeOwnerCheckIn)

router.get('/reviews', ReviewsController.getOwnerReviews)
router.post('/reviews/:reviewId/reply', validationMiddleware(OwnerReplyReviewDto), ReviewsController.ownerReplyReview)
router.delete('/reviews/:reviewId', ReviewsController.ownerDeleteReview)

export const ownerRoute = router
