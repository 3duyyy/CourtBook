import { chatbotService, type ChatMessage } from "~/services/chatbotService"

export function useChatbot() {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const isOpen = ref(false)

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading.value) return
    // Thêm message user
    messages.value.push({ role: "user", content: text })
    loading.value = true
    try {
      // Gửi kèm history (tối đa 10 tin gần nhất)
      const history = messages.value.slice(-10, -1) // bỏ tin vừa thêm
      const res = await chatbotService.sendMessage(text, history)
      const reply = res.data.data.reply
      messages.value.push({ role: "model", content: reply })
    } catch {
      messages.value.push({
        role: "model",
        content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
      })
    } finally {
      loading.value = false
    }
  }

  const clearMessages = () => {
    messages.value = []
  }
  return { messages, loading, isOpen, toggle, sendMessage, clearMessages }
}
