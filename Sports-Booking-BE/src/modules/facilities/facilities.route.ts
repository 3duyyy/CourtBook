import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { AuthorizationMiddleware } from '../../middlewares/authorization.middleware'
import { validationMiddleware } from '../../middlewares/validation.middleware'
import { CreateFacilityDto, CreateFieldDto, SetFieldPricesDto } from '../../dtos/facilities.dto'
import { FacilitiesController } from './facilities.controller'

const router = Router()

router.use(authMiddleware, AuthorizationMiddleware.ownerOnly())
router.post('/facilities', validationMiddleware(CreateFacilityDto), FacilitiesController.createFacility)
router.get('/facilities', FacilitiesController.getMyFacilities)
router.post('/facilities/:facilityId/fields', validationMiddleware(CreateFieldDto), FacilitiesController.createField)
router.put('/fields/:fieldId/prices', validationMiddleware(SetFieldPricesDto), FacilitiesController.setFieldPrices)

export const ownerRoute = router
