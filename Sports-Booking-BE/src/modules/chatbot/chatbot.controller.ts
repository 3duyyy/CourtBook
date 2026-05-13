import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ChatbotService } from './chatbot.service'

export class ChatbotController {
  static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, history } = req.body

      if (!message || !message.trim()) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Message is required' })
        return
      }

      let result
      if (req.user?.id) {
        result = await ChatbotService.chatWithContext(req.user.id, message, history || [])
      } else {
        result = await ChatbotService.chat(message, history || [])
      }

      res.status(StatusCodes.OK).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
