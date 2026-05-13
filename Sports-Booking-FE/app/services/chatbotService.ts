import { axiosInstance } from "./axiosInstance"
import type { ApiResponse } from "~/types/common"

export interface ChatMessage {
  role: "user" | "model"
  content: string
}

export interface ChatResponse {
  reply: string
}

export const chatbotService = {
  sendMessage(message: string, history: ChatMessage[] = []) {
    return axiosInstance.post<ApiResponse<ChatResponse>>("/chatbot/chat", {
      message,
      history,
    })
  },
}
