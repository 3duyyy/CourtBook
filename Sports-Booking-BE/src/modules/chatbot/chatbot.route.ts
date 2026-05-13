import { Router } from 'express'
import { ChatbotController } from './chatbot.controller'
import { optionalAuthMiddleware } from '../../middlewares/auth.middleware'

const router = Router()
router.post('/chat', optionalAuthMiddleware, ChatbotController.chat)

export const chatbotRoutes = router
