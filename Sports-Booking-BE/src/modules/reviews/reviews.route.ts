import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { AuthorizationMiddleware } from '../../middlewares/authorization.middleware'
import { validationMiddleware } from '../../middlewares/validation.middleware'
import { CreateReviewDto } from '../../dtos/reviews.dto'
import { ReviewsController } from './reviews.controller'

const router = Router()
router.use(authMiddleware)

router.post(
  '/',
  AuthorizationMiddleware.permission('create_review'),
  validationMiddleware(CreateReviewDto),
  ReviewsController.createReview
)
router.get('/can-review', ReviewsController.checkCanReview)
router.delete('/:reviewId', ReviewsController.deleteOwnReview)
router.delete('/reviews/:reviewId/reply', ReviewsController.deleteOwnerReplyReview)

export const reviewsRoute = router
