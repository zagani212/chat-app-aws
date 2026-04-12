<template>
  <div class="chat-page">
    <aside class="sidebar">
      <div class="sidebar-head">
        <h3>Discussions</h3>
      </div>
      <div class="discussion-list">
        <button
          v-for="room in rooms"
          :key="room.id"
          :class="['discussion-item', { active: activeRoom?.id === room.id }]"
          @click="selectRoom(room)"
        >
          <div class="discussion-name">{{ room.name }}</div>
          <div class="discussion-meta">{{ room.type === 'group' ? 'Group' : 'Direct' }}</div>
        </button>
      </div>
    </aside>

    <section class="chat-main">
      <header class="chat-actions">
        <button class="btn btn-plus" @click="openDirectModal" title="Start direct chat">+</button>
        <button class="btn btn-group" @click="openGroupModal">Create Group</button>
      </header>

      <div v-if="!activeRoom" class="empty-state">
        <h2>Select or create a discussion</h2>
        <p>Use + for direct message, or Create Group for a group chat.</p>
      </div>

      <div v-else class="chat-wrapper">
        <div class="chat-header">
          <h2>{{ activeRoom.name }}</h2>
          <button @click="leaveRoom" class="btn btn-leave">Leave</button>
        </div>

        <div class="messages" ref="messagesContainer">
          <div v-if="messages.length === 0" class="empty-messages">No messages yet.</div>
          <div v-for="msg in messages" :key="msg.id" :class="['msg-row', { own: msg.userId === currentUserId }]">
            <div class="msg-bubble">
              <div class="msg-sender">{{ msg.sender }}</div>
              <div class="msg-text">{{ msg.content }}</div>
              <div class="msg-time">
                {{ formatTime(msg.timestamp) }}
                <span v-if="msg.userId === currentUserId" class="msg-status" :title="msg.deliveryStatus || 'sent'">
                  {{ formatDeliveryStatus(msg.deliveryStatus) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="composer">
          <input
            v-model="messageInput"
            class="composer-input"
            placeholder="Type a message..."
            @keyup.enter="sendMessage"
          />
          <button @click="sendMessage" class="btn btn-send" :disabled="!messageInput.trim()">Send</button>
        </div>
      </div>
    </section>

    <div v-if="showDirectModal" class="modal-overlay" @click="showDirectModal = false">
      <div class="modal" @click.stop>
        <h3>Start New Chat</h3>
        <p class="modal-subtext">Choose one user and click Message.</p>
        <div class="users-select-list">
          <div v-for="user in users" :key="`direct-${user.userId}`" class="user-card">
            <div class="user-card-top">
              <span class="user-name">{{ user.username }}</span>
              <span :class="['status-chip', user.status === 'ONLINE' ? 'online' : 'offline']">{{ user.status }}</span>
            </div>
            <div class="user-last-seen">Last seen: {{ formatLastSeen(user.lastSeen) }}</div>
            <button class="btn btn-message" :disabled="isCreatingDirectRoom" @click="createDirectRoom(user)">
              {{ isCreatingDirectRoom ? 'Creating...' : 'Message' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showGroupModal" class="modal-overlay" @click="showGroupModal = false">
      <div class="modal" @click.stop>
        <h3>Create Group</h3>
        <input v-model="newGroupName" class="composer-input" placeholder="Enter group name" />
        <div class="users-select-list">
          <label v-for="user in users" :key="`group-${user.userId}`" class="group-row">
            <input type="checkbox" :value="user.userId" v-model="selectedGroupUsers" />
            <div>
              <div class="user-name">{{ user.username }}</div>
              <div class="user-last-seen">Last seen: {{ formatLastSeen(user.lastSeen) }} - {{ user.status }}</div>
            </div>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showGroupModal = false">Cancel</button>
          <button
            class="btn btn-group"
            :disabled="!newGroupName.trim() || selectedGroupUsers.length === 0"
            @click="createGroupRoom"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import authService from '../services/auth'
import websocketService from '../services/websocket'

export default {
  name: 'Chat',
  setup() {
    const rooms = ref([])
    const activeRoom = ref(null)
    const messages = ref([])
    const messageInput = ref('')
    const showDirectModal = ref(false)
    const showGroupModal = ref(false)
    const newGroupName = ref('')
    const selectedGroupUsers = ref([])
    const isCreatingDirectRoom = ref(false)
    const pendingDirectTargetUserId = ref('')
    const messagesContainer = ref(null)
    const users = ref([])

    const userInfo = computed(() => authService.getUserInfo())
    const currentUserId = computed(() => userInfo.value?.sub || '')

    const parseUsersPayload = (payload) => {
      if (Array.isArray(payload)) return payload
      if (typeof payload === 'string') {
        try {
          const parsed = JSON.parse(payload)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }
      return []
    }

    const requestUsers = () => {
      websocketService.listUsers()
    }

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    const handleConnected = () => {
      requestUsers()
      
    }

    const handleDisconnected = () => {}

    const handleIncomingMessage = (data) => {
      const incoming = data?.type === 'NEW_MESSAGE' && data?.message ? data.message : data

      if (!incoming?.roomId || !incoming?.content) {
        return
      }

      const roomId = incoming.roomId
      const room = rooms.value.find((r) => r.id === roomId)

      if (!room) {
        rooms.value.unshift({
          id: roomId,
          name: roomId,
          type: 'direct',
          unreadCount: 0
        })
      }

      const pendingIndex = messages.value.findIndex(
        (msg) =>
          msg.roomId === roomId &&
          msg.deliveryStatus === 'pending' &&
          msg.content === incoming.content
      )

      if (pendingIndex !== -1) {
        const pendingMessage = messages.value[pendingIndex]
        messages.value[pendingIndex] = {
          ...pendingMessage,
          id: incoming.messageId || pendingMessage.id,
          messageId: incoming.messageId || pendingMessage.messageId,
          timestamp: incoming.timestamp || pendingMessage.timestamp,
          deliveryStatus: 'sent'
        }
        if (activeRoom.value?.id === roomId) {
          scrollToBottom()
        }
        return
      }

      if (activeRoom.value?.id === roomId) {
        if (incoming.messageId && messages.value.some((msg) => msg.id === incoming.messageId)) {
          return
        }

        messages.value.push({
          id: incoming.messageId || Date.now().toString(),
          roomId,
          userId: incoming.userId || '',
          sender: incoming.sender || incoming.username || 'User',
          content: incoming.content,
          timestamp: incoming.timestamp || new Date().toISOString(),
          deliveryStatus: 'sent'
        })
        scrollToBottom()
      } else {
        const targetRoom = rooms.value.find((r) => r.id === roomId)
        if (targetRoom) {
          targetRoom.unreadCount = (targetRoom.unreadCount || 0) + 1
        }
      }
    }

    const getParticipants = (participants) => {
      if (Array.isArray(participants)) return participants
      if (participants && typeof participants === 'object') return Object.values(participants)
      return []
    }

    const getParticipantIds = (participants) => {
      return getParticipants(participants)
        .map((participant) => {
          if (typeof participant === 'string') return participant
          if (participant && typeof participant === 'object') return participant.userId || participant.id || participant.sub || ''
          return ''
        })
        .filter(Boolean)
    }

    const handleCreateRoomResponse = (payload) => {
      const room = payload?.room || payload
      if (!room?.roomId) return

      const participants = getParticipants(room.participants)
      const participantIds = getParticipantIds(room.participants)

      if (participantIds.length > 0 && !participantIds.includes(currentUserId.value)) {
        return
      }

      const targetId = participantIds.find((id) => id !== currentUserId.value) || pendingDirectTargetUserId.value
      const targetUser = users.value.find((user) => user.userId === targetId)
      const roomName = targetUser?.username || room.roomKey || 'Direct chat'

      if (!rooms.value.some((existingRoom) => existingRoom.id === room.roomId)) {
        rooms.value.unshift({
          id: room.roomId,
          name: roomName,
          type: 'direct',
          unreadCount: 0
        })
      }

      activeRoom.value = rooms.value.find((existingRoom) => existingRoom.id === room.roomId)
      messages.value = []
      showDirectModal.value = false
      isCreatingDirectRoom.value = false
      pendingDirectTargetUserId.value = ''
    }

    const handleGetRoomsResponse = (payload) => {
      const incomingRooms = Array.isArray(payload?.rooms)
        ? payload.rooms
        : Array.isArray(payload)
          ? payload
          : []

      if (!incomingRooms.length) return

      rooms.value = incomingRooms
        .filter((room) => room && (room.roomId || room.id))
        .map((room) => {
          const participantIds = getParticipantIds(room.participants)
          const otherParticipantId = participantIds.find((id) => id !== currentUserId.value)
          const otherParticipant = getParticipants(room.participants).find((p) => {
            if (typeof p === 'string') return p === otherParticipantId
            return p?.userId === otherParticipantId
          })

          const roomName =
            room.name ||
            otherParticipant?.username ||
            otherParticipant?.email ||
            room.roomKey ||
            'Direct chat'

          return {
            id: room.roomId || room.id,
            name: roomName,
            type: getParticipants(room.participants).length > 2 ? 'group' : 'direct',
            unreadCount: room.unreadCount || 0
          }
        })
    }

    const handleSocketMessage = (data) => {
      let parsedUsers = []

      if (Array.isArray(data)) {
        parsedUsers = data
      } else if (data && typeof data === 'object') {
        if (data.action === 'listUsers' || data.type === 'listUsers' || data.method === 'listUsers') {
          parsedUsers = parseUsersPayload(data.users || data.data || data.body || data.payload || data.result)
        } else if (data.users) {
          parsedUsers = parseUsersPayload(data.users)
        } else if (typeof data.message === 'string') {
          parsedUsers = parseUsersPayload(data.message)
        }
      } else if (typeof data === 'string') {
        parsedUsers = parseUsersPayload(data)
      }

      if (
        data?.type === 'NEW_MESSAGE' ||
        data?.action === 'message' ||
        data?.type === 'message' ||
        data?.action === 'sendMessage'
      ) {
        handleIncomingMessage(data)
      }

      if (data && typeof data === 'object') {
        if (
          data.type === 'ROOM_CREATED' ||
          data.action === 'ROOM_CREATED' ||
          data.method === 'ROOM_CREATED' ||
          data.type === 'createRoom' ||
          data.action === 'createRoom' ||
          data.method === 'createRoom' ||
          data.room
        ) {
          handleCreateRoomResponse(data)
        }
      }

      if (data && typeof data === 'object') {
        if (
          data.type === 'ROOMS_FETCHED' ||
          data.action === 'ROOMS_FETCHED' ||
          data.method === 'ROOMS_FETCHED' ||
          data.type === 'getRooms' ||
          data.action === 'getRooms' ||
          data.method === 'getRooms' ||
          data.type === 'GetRooms' ||
          data.action === 'GetRooms' ||
          data.method === 'GetRooms' ||
          data.rooms
        ) {
          handleGetRoomsResponse(data)
        }
      }

      if (parsedUsers.length > 0) {
        users.value = parsedUsers
          .filter((user) => user.userId !== currentUserId.value)
          .map((user) => ({
            username: user.username || 'Unknown',
            lastSeen: user.lastSeen || '',
            userId: user.userId || user.id || user.username,
            status: (user.status || 'OFFLINE').toUpperCase()
          }))
      }
    }

    const selectRoom = (room) => {
      activeRoom.value = room
      messages.value = []
      room.unreadCount = 0
      websocketService.joinRoom(room.id)
    }

    const sendMessage = () => {
      const content = messageInput.value.trim()
      if (!content || !activeRoom.value) return

      const message = {
        id: `temp-${Date.now()}`,
        roomId: activeRoom.value.id,
        userId: currentUserId.value,
        sender: userInfo.value?.email || 'Anonymous',
        content,
        timestamp: new Date().toISOString(),
        deliveryStatus: 'pending'
      }

      messages.value.push(message)
      messageInput.value = ''
      websocketService.sendMessage(activeRoom.value.id, content)
      scrollToBottom()
    }

    const createDirectRoom = (user) => {
      if (isCreatingDirectRoom.value) return
      isCreatingDirectRoom.value = true
      pendingDirectTargetUserId.value = user.userId
      websocketService.createRoom(user.userId)
    }

    const createGroupRoom = () => {
      if (!newGroupName.value.trim() || selectedGroupUsers.value.length === 0) return

      const roomId = `group-${Date.now()}`
      rooms.value.unshift({
        id: roomId,
        name: newGroupName.value.trim(),
        type: 'group',
        unreadCount: 0
      })

      websocketService.createGroupRoom(newGroupName.value.trim(), selectedGroupUsers.value)
      activeRoom.value = rooms.value[0]
      messages.value = []
      newGroupName.value = ''
      selectedGroupUsers.value = []
      showGroupModal.value = false
    }

    const leaveRoom = () => {
      if (activeRoom.value) {
        websocketService.leaveRoom(activeRoom.value.id)
        activeRoom.value = null
        messages.value = []
      }
    }

    const openDirectModal = () => {
      requestUsers()
      showDirectModal.value = true
    }

    const openGroupModal = () => {
      requestUsers()
      selectedGroupUsers.value = []
      newGroupName.value = ''
      showGroupModal.value = true
    }

    const formatTime = (date) => {
      const d = new Date(date)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const formatDeliveryStatus = (status) => {
      if (status === 'pending') return '🕒'
      return '✓✓'
    }

    const formatLastSeen = (date) => {
      if (!date) return '-'
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) return '-'
      return d.toLocaleString()
    }

    onMounted(async () => {
      websocketService.on('message', handleSocketMessage)
      websocketService.on('connected', handleConnected)
      websocketService.on('disconnected', handleDisconnected)

      try {
        await websocketService.connect(currentUserId.value)
        console.log(websocketService)
        websocketService.getRooms()  // ← Nouveau
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error)
      }
    })

    onUnmounted(() => {
      websocketService.off('message', handleSocketMessage)
      websocketService.off('connected', handleConnected)
      websocketService.off('disconnected', handleDisconnected)
    })

    return {
      rooms,
      activeRoom,
      messages,
      messageInput,
      showDirectModal,
      showGroupModal,
      newGroupName,
      selectedGroupUsers,
      isCreatingDirectRoom,
      messagesContainer,
      users,
      currentUserId,
      selectRoom,
      sendMessage,
      createDirectRoom,
      createGroupRoom,
      leaveRoom,
      openDirectModal,
      openGroupModal,
      requestUsers,
      formatTime,
      formatDeliveryStatus,
      formatLastSeen
    }
  }
}
</script>

<style scoped>
.chat-page {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: calc(100vh - 80px);
  background: #eef2f7;
}

.sidebar {
  border-right: 1px solid #d7dde6;
  background: #f7f9fc;
  display: flex;
  flex-direction: column;
}

.sidebar-head {
  padding: 1rem;
  border-bottom: 1px solid #e2e7ef;
}

.sidebar-head h3 {
  margin: 0;
  font-size: 1rem;
  color: #1f2a37;
}

.discussion-list {
  overflow-y: auto;
}

.discussion-item {
  width: 100%;
  text-align: left;
  border: none;
  border-bottom: 1px solid #e8edf3;
  background: #fff;
  padding: 0.85rem 1rem;
  cursor: pointer;
}

.discussion-item:hover {
  background: #f3f8ff;
}

.discussion-item.active {
  background: #deebff;
}

.discussion-name {
  font-weight: 600;
  color: #1f2a37;
}

.discussion-meta {
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: #64748b;
}

.chat-main {
  display: flex;
  flex-direction: column;
  background: #f0f4f9;
}

.chat-actions {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #d9e1ea;
  background: #fff;
}

.btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-plus {
  width: 36px;
  height: 36px;
  background: #0b6bcb;
  color: #fff;
  font-size: 1.2rem;
}

.btn-group {
  padding: 0.45rem 0.9rem;
  background: #1f7a3f;
  color: #fff;
}

.btn-group:disabled,
.btn-send:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.empty-state {
  margin: auto;
  text-align: center;
  color: #5e6d80;
}

.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #d9e1ea;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #1f2a37;
}

.btn-leave {
  background: #e35757;
  color: #fff;
  padding: 0.35rem 0.7rem;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-messages {
  color: #7a889a;
}

.msg-row {
  margin-bottom: 0.7rem;
}

.msg-row.own {
  text-align: right;
}

.msg-bubble {
  display: inline-block;
  max-width: 70%;
  border-radius: 10px;
  background: #fff;
  padding: 0.5rem 0.7rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.msg-row.own .msg-bubble {
  background: #d7f6c8;
}

.msg-sender {
  font-size: 0.75rem;
  font-weight: 700;
  color: #37506d;
}

.msg-text {
  margin-top: 0.2rem;
  color: #1f2a37;
}

.msg-time {
  margin-top: 0.2rem;
  font-size: 0.7rem;
  color: #6e7f93;
  display: flex;
  gap: 0.35rem;
  align-items: center;
  justify-content: flex-end;
}

.msg-status {
  color: #4d6a85;
  font-size: 0.8rem;
  line-height: 1;
}

.composer {
  display: flex;
  gap: 0.6rem;
  padding: 0.75rem;
  border-top: 1px solid #d9e1ea;
  background: #fff;
}

.composer-input {
  flex: 1;
  border: 1px solid #c7d2e0;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
}

.btn-send {
  background: #0b6bcb;
  color: #fff;
  padding: 0.45rem 0.8rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 17, 31, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: min(620px, 92vw);
  max-height: 80vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 12px;
  padding: 1rem;
}

.modal h3 {
  margin: 0;
  color: #1f2a37;
}

.modal-subtext {
  margin: 0.4rem 0 0.8rem;
  color: #64748b;
}

.users-select-list {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.6rem;
}

.user-card {
  border: 1px solid #dde5ef;
  border-radius: 8px;
  padding: 0.6rem;
}

.user-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-name {
  font-weight: 600;
  color: #1f2a37;
}

.status-chip {
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}

.status-chip.online {
  background: #d8f5e3;
  color: #0f6a36;
}

.status-chip.offline {
  background: #edf1f5;
  color: #607184;
}

.user-last-seen {
  margin-top: 0.35rem;
  color: #65778d;
  font-size: 0.8rem;
}

.btn-message {
  margin-top: 0.5rem;
  background: #0b6bcb;
  color: #fff;
  padding: 0.4rem 0.7rem;
}

.group-row {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  border: 1px solid #dde5ef;
  border-radius: 8px;
  padding: 0.55rem;
}

.modal-actions {
  margin-top: 0.8rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.btn-secondary {
  background: #e8edf3;
  color: #2c3e53;
  padding: 0.45rem 0.8rem;
}

@media (max-width: 900px) {
  .chat-page {
    grid-template-columns: 1fr;
  }

  .sidebar {
    max-height: 34vh;
  }
}
</style>
