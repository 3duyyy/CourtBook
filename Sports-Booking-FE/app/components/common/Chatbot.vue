<template>
  <v-btn v-if="!isOpen" class="chatbot-fab" icon color="success" size="56" elevation="6" @click="toggle">
    <v-icon :icon="mdiRobotHappyOutline" size="28" />
  </v-btn>

  <Transition name="chat-slide">
    <div v-if="isOpen" class="chatbot-panel">
      <div class="chatbot-header">
        <div class="flex items-center gap-3">
          <v-icon :icon="mdiRobotHappyOutline" size="20" class="text-white mb-1" />
          <span class="font-bold text-white">Sport Booker AI</span>
        </div>
        <v-btn icon variant="text" size="small" @click="toggle">
          <v-icon :icon="mdiClose" color="white" size="20" />
        </v-btn>
      </div>

      <div ref="messagesContainer" class="chatbot-messages">
        <div v-if="messages.length === 0" class="chatbot-welcome">
          <v-icon :icon="mdiRobotHappyOutline" size="40" />
          <p class="font-bold mt-2">Xin chào! 👋</p>
          <p class="text-sm text-slate-500">Tôi có thể giúp bạn tìm sân, kiểm tra booking hoặc giải đáp thắc mắc.</p>

          <div class="chatbot-suggestions">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              class="chatbot-suggestion-btn"
              @click="sendMessage(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>

        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="chatbot-msg"
          :class="msg.role === 'user' ? 'chatbot-msg--user' : 'chatbot-msg--bot'"
        >
          <div class="chatbot-bubble" :class="msg.role === 'user' ? 'chatbot-bubble--user' : 'chatbot-bubble--bot'">
            {{ msg.content }}
          </div>
        </div>

        <div v-if="loading" class="chatbot-msg chatbot-msg--bot">
          <div class="chatbot-bubble chatbot-bubble--bot chatbot-typing"><span /><span /><span /></div>
        </div>
      </div>

      <div class="chatbot-input">
        <input v-model="inputText" placeholder="Nhập tin nhắn..." class="chatbot-input-field" @keyup.enter="handleSend" />
        <v-btn icon variant="text" color="success" :disabled="!inputText.trim() || loading" @click="handleSend">
          <v-icon :icon="mdiSend" />
        </v-btn>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { mdiClose, mdiRobotHappyOutline, mdiSend } from "@mdi/js"
import { useChatbot } from "~/composables/chatbot/useChatbot"

const { messages, loading, isOpen, toggle, sendMessage } = useChatbot()

const inputText = ref("")
const messagesContainer = ref<HTMLElement>()

const suggestions = ["Làm sao để đặt sân?", "Chính sách hoàn tiền?", "Tìm sân bóng đá", "Kiểm tra booking của tôi"]

function handleSend() {
  if (!inputText.value.trim()) return
  sendMessage(inputText.value)
  inputText.value = ""
}

watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
)
</script>

<style scoped>
.chatbot-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.chatbot-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 380px;
  height: 520px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1001;
}

.chatbot-header {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chatbot-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chatbot-welcome {
  text-align: center;
  padding: 20px 10px;
}

.chatbot-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}

.chatbot-suggestion-btn {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  color: #15803d;
  cursor: pointer;
  transition: all 0.2s;
}

.chatbot-suggestion-btn:hover {
  background: #dcfce7;
  border-color: #86efac;
}

.chatbot-msg {
  display: flex;
}

.chatbot-msg--user {
  justify-content: flex-end;
}

.chatbot-msg--bot {
  justify-content: flex-start;
}

.chatbot-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.chatbot-bubble--user {
  background: #22c55e;
  color: white;
  border-bottom-right-radius: 4px;
}

.chatbot-bubble--bot {
  background: #f1f5f9;
  color: #334155;
  border-bottom-left-radius: 4px;
}

/* Typing indicator */
.chatbot-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 18px;
}

.chatbot-typing span {
  width: 8px;
  height: 8px;
  background: #94a3b8;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.chatbot-typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.chatbot-typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}

.chatbot-input {
  border-top: 1px solid #e2e8f0;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chatbot-input-field {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 10px 16px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.chatbot-input-field:focus {
  border-color: #22c55e;
}

/* Slide animation */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.3s ease;
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@media (max-width: 420px) {
  .chatbot-panel {
    width: calc(100vw - 16px);
    height: calc(100vh - 100px);
    bottom: 8px;
    right: 8px;
  }
}
</style>
