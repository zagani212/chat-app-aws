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
          <span v-if="room.unreadCount > 0" class="discussion-badge">{{ room.unreadCount }}</span>
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

        <div class="messages" ref="messagesContainer" @scroll.passive="handleMessagesScroll">
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
          <div v-if="activeRoomIsRemoteTyping" class="typing-indicator">
            <span>Typing</span>
            <span class="typing-dots">
              <i></i><i></i><i></i>
            </span>
          </div>
          <input
            v-model="messageInput"
            class="composer-input"
            placeholder="Type a message..."
            @input="handleTyping"
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
            <div v-if="user.status !== 'ONLINE'" class="user-last-seen">Last seen: {{ formatLastSeen(user.lastSeen) }}</div>
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
              <div v-if="user.status !== 'ONLINE'" class="user-last-seen">Last seen: {{ formatLastSeen(user.lastSeen) }} - {{ user.status }}</div>
              <div v-else class="user-last-seen">{{ user.status }}</div>
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
    const messagesByRoom = ref({})
    const messageInput = ref('')
    const showDirectModal = ref(false)
    const showGroupModal = ref(false)
    const newGroupName = ref('')
    const selectedGroupUsers = ref([])
    const isCreatingDirectRoom = ref(false)
    const isCreatingGroupRoom = ref(false)
    const pendingDirectTargetUserId = ref('')
    const pendingLeaveRoomId = ref('')
    const messagesContainer = ref(null)
    const users = ref([])
    const isTyping = ref(false)
    const remoteTypingByRoom = ref({})
    const isRefreshingMessages = ref(false)

    let typingTimeoutId = null
    let messageRefreshTimeoutId = null
    const remoteTypingTimeouts = {}

    const userInfo = computed(() => authService.getUserInfo())
    const currentUserId = computed(() => userInfo.value?.sub || userInfo.value?.userId || '')
    const currentUsername = computed(
      () => userInfo.value?.username || userInfo.value?.['cognito:username'] || userInfo.value?.name || 'You'
    )
    const currentUserEmail = computed(() => userInfo.value?.email || '')
    const activeRoomIsRemoteTyping = computed(() => {
      const roomId = activeRoom.value?.id
      if (!roomId) return false
      return Boolean(remoteTypingByRoom.value[roomId])
    })

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

    const isCurrentUser = (user) => {
      if (!user || typeof user !== 'object') return false

      const candidateId = user.userId || user.id || user.sub || ''
      const candidateUsername = user.username || ''
      const candidateEmail = user.email || ''

      if (candidateId && currentUserId.value && candidateId === currentUserId.value) return true
      if (candidateUsername && currentUsername.value && candidateUsername === currentUsername.value) return true
      if (candidateEmail && currentUserEmail.value && candidateEmail === currentUserEmail.value) return true

      return false
    }

    const requestUsers = () => {
      websocketService.listUsers()
    }

    const requestMessages = () => {
      if (isRefreshingMessages.value) return
      isRefreshingMessages.value = true
      websocketService.getMessages()

      if (messageRefreshTimeoutId) {
        clearTimeout(messageRefreshTimeoutId)
      }

      messageRefreshTimeoutId = setTimeout(() => {
        isRefreshingMessages.value = false
        messageRefreshTimeoutId = null
      }, 1000)
    }

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    const handleMessagesScroll = () => {
      const container = messagesContainer.value
      if (!container || !activeRoom.value) return

      if (container.scrollTop <= 80) {
        requestMessages()
      }
    }

    const clearTypingTimeout = () => {
      if (typingTimeoutId) {
        clearTimeout(typingTimeoutId)
        typingTimeoutId = null
      }
    }

    const sendTypingState = (value) => {
      if (!activeRoom.value?.id) return
      websocketService.isTyping(activeRoom.value.id, value)
    }

    const stopTyping = () => {
      clearTypingTimeout()

      if (isTyping.value) {
        isTyping.value = false
        sendTypingState(false)
      }
    }

    const clearRemoteTypingTimeout = (roomId) => {
      if (!roomId) return
      if (remoteTypingTimeouts[roomId]) {
        clearTimeout(remoteTypingTimeouts[roomId])
        delete remoteTypingTimeouts[roomId]
      }
    }

    const setRemoteTypingState = (roomId, value) => {
      if (!roomId) return

      clearRemoteTypingTimeout(roomId)
      remoteTypingByRoom.value = {
        ...remoteTypingByRoom.value,
        [roomId]: Boolean(value)
      }

      if (value) {
        remoteTypingTimeouts[roomId] = setTimeout(() => {
          const next = { ...remoteTypingByRoom.value }
          next[roomId] = false
          remoteTypingByRoom.value = next
          delete remoteTypingTimeouts[roomId]
        }, 2500)
      }
    }

    const clearAllRemoteTypingTimeouts = () => {
      Object.keys(remoteTypingTimeouts).forEach((roomId) => {
        clearTimeout(remoteTypingTimeouts[roomId])
        delete remoteTypingTimeouts[roomId]
      })
    }

    const handleTyping = () => {
      if (!activeRoom.value?.id) return

      if (!isTyping.value) {
        isTyping.value = true
        sendTypingState(true)
      }

      clearTypingTimeout()
      typingTimeoutId = setTimeout(() => {
        typingTimeoutId = null
        if (isTyping.value) {
          isTyping.value = false
          sendTypingState(false)
        }
      }, 1200)
    }

    const getRoomMessages = (roomId) => {
      if (!messagesByRoom.value[roomId]) {
        messagesByRoom.value[roomId] = []
      }
      return messagesByRoom.value[roomId]
    }

    const sortMessagesByTimestamp = (list) => {
      return [...list].sort((a, b) => {
        const aTime = new Date(a?.timestamp || 0).getTime()
        const bTime = new Date(b?.timestamp || 0).getTime()
        return aTime - bTime
      })
    }

    const sortRoomMessages = (roomId) => {
      const sorted = sortMessagesByTimestamp(getRoomMessages(roomId))
      messagesByRoom.value[roomId] = sorted
      return sorted
    }

    const syncActiveRoomMessages = (roomId) => {
      if (activeRoom.value?.id === roomId) {
        messages.value = [...sortRoomMessages(roomId)]
      }
    }

    const resolveSenderName = (payload, senderId) => {
      const senderObject = payload?.sender && typeof payload.sender === 'object' ? payload.sender : null
      const senderString = typeof payload?.sender === 'string' ? payload.sender : ''
      const knownUser = users.value.find((user) => user.userId === senderId)

      if (senderObject?.username) return senderObject.username
      if (payload?.username) return payload.username
      if (payload?.senderUsername) return payload.senderUsername
      if (senderString) return senderString
      if (knownUser?.username) return knownUser.username
      if (senderId && senderId === currentUserId.value) return currentUsername.value
      return 'User'
    }

    const resolveSenderId = (payload) => {
      if (!payload || typeof payload !== 'object') return ''
      if (payload.userId) return payload.userId
      if (payload.senderId) return payload.senderId
      if (payload.sender && typeof payload.sender === 'object') {
        return payload.sender.userId || payload.sender.id || payload.sender.sub || ''
      }
      return ''
    }

    const handleConnected = () => {
      requestUsers()
      requestMessages()
    }

    const handleDisconnected = () => {}

    const handleIncomingMessage = (data) => {
      const incoming = data?.type === 'NEW_MESSAGE' && data?.message ? data.message : data
      let incomingUserId = resolveSenderId(incoming)

      if (!incomingUserId) {
        const incomingSenderName =
          incoming?.username ||
          incoming?.senderUsername ||
          (incoming?.sender && typeof incoming.sender === 'object' ? incoming.sender.username : '') ||
          (typeof incoming?.sender === 'string' ? incoming.sender : '')

        if (incomingSenderName && incomingSenderName === currentUsername.value) {
          incomingUserId = currentUserId.value
        }
      }

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

      const roomMessages = getRoomMessages(roomId)

      const pendingIndex = roomMessages.findIndex(
        (msg) =>
          msg.roomId === roomId &&
          msg.deliveryStatus === 'pending' &&
          msg.content === incoming.content
      )

      if (pendingIndex !== -1) {
        const pendingMessage = roomMessages[pendingIndex]
        roomMessages[pendingIndex] = {
          ...pendingMessage,
          id: incoming.messageId || pendingMessage.id,
          messageId: incoming.messageId || pendingMessage.messageId,
          timestamp: incoming.timestamp || pendingMessage.timestamp,
          deliveryStatus: 'sent'
        }
        sortRoomMessages(roomId)
        syncActiveRoomMessages(roomId)
        if (activeRoom.value?.id === roomId) {
          scrollToBottom()
        }
        return
      }

      if (activeRoom.value?.id === roomId) {
        if (incoming.messageId && roomMessages.some((msg) => msg.id === incoming.messageId)) {
          return
        }

        roomMessages.push({
          id: incoming.messageId || Date.now().toString(),
          roomId,
          userId: incomingUserId,
          sender: resolveSenderName(incoming, incomingUserId),
          content: incoming.content,
          timestamp: incoming.timestamp || new Date().toISOString(),
          deliveryStatus: 'sent'
        })
        sortRoomMessages(roomId)
        syncActiveRoomMessages(roomId)
        scrollToBottom()
      } else {
        if (incoming.messageId && roomMessages.some((msg) => msg.id === incoming.messageId)) {
          return
        }
        roomMessages.push({
          id: incoming.messageId || Date.now().toString(),
          roomId,
          userId: incomingUserId,
          sender: resolveSenderName(incoming, incomingUserId),
          content: incoming.content,
          timestamp: incoming.timestamp || new Date().toISOString(),
          deliveryStatus: 'sent'
        })
        sortRoomMessages(roomId)
        const targetRoom = rooms.value.find((r) => r.id === roomId)
        if (targetRoom) {
          targetRoom.unreadCount = (targetRoom.unreadCount || 0) + 1
        }
      }
    }

    const normalizeMessagesPayload = (payload) => {
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

    const handleMessagesFetched = (payload) => {
      const incomingMessages = normalizeMessagesPayload(
        payload?.messages || payload?.data || payload?.body || payload?.payload || payload
      )

      if (!incomingMessages.length) return

      incomingMessages.forEach((message) => {
        if (!message?.roomId || !message?.content) return
        let messageUserId = resolveSenderId(message)

        if (!messageUserId) {
          const fetchedSenderName =
            message?.username ||
            message?.senderUsername ||
            (message?.sender && typeof message.sender === 'object' ? message.sender.username : '') ||
            (typeof message?.sender === 'string' ? message.sender : '')

          if (fetchedSenderName && fetchedSenderName === currentUsername.value) {
            messageUserId = currentUserId.value
          }
        }

        if (!rooms.value.some((room) => room.id === message.roomId)) {
          rooms.value.unshift({
            id: message.roomId,
            name: message.roomId,
            type: 'direct',
            unreadCount: 0
          })
        }

        const roomMessages = getRoomMessages(message.roomId)
        const messageId = message.messageId || message.id

        if (messageId && roomMessages.some((existing) => existing.id === messageId)) {
          return
        }

        roomMessages.push({
          id: messageId || Date.now().toString(),
          roomId: message.roomId,
          userId: messageUserId,
          sender: resolveSenderName(message, messageUserId),
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
          deliveryStatus: messageUserId === currentUserId.value ? 'sent' : 'sent'
        })
        sortRoomMessages(message.roomId)
      })

      if (activeRoom.value?.id) {
        syncActiveRoomMessages(activeRoom.value.id)
        scrollToBottom()
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

      const isGroupRoom =
        room?.type === 'GROUP' ||
        room?.type === 'group' ||
        participants.length > 2 ||
        Boolean(room?.name)

      const targetId = participantIds.find((id) => id !== currentUserId.value) || pendingDirectTargetUserId.value
      const targetUser = users.value.find((user) => user.userId === targetId)
      const otherParticipant = participants.find((participant) => {
        if (!participant || typeof participant !== 'object') return false
        const participantId = participant.userId || participant.id || participant.sub || ''
        return participantId && participantId !== currentUserId.value
      })
      const roomName = isGroupRoom
        ? room?.name || room?.roomKey || 'Group chat'
        : otherParticipant?.username || otherParticipant?.email || targetUser?.username || room?.roomKey || 'Direct chat'

      const existingRoom = rooms.value.find((existing) => existing.id === room.roomId)

      if (existingRoom) {
        existingRoom.name = roomName
        existingRoom.type = isGroupRoom ? 'group' : 'direct'
      }

      if (!existingRoom) {
        rooms.value.unshift({
          id: room.roomId,
          name: roomName,
          type: isGroupRoom ? 'group' : 'direct',
          unreadCount: 0
        })
      }

      activeRoom.value = rooms.value.find((existingRoom) => existingRoom.id === room.roomId)
      messages.value = [...sortRoomMessages(room.roomId)]
      showDirectModal.value = false
      showGroupModal.value = false
      isCreatingDirectRoom.value = false
      isCreatingGroupRoom.value = false
      pendingDirectTargetUserId.value = ''
      newGroupName.value = ''
      selectedGroupUsers.value = []
    }

    const removeRoomFromLocalState = (roomId) => {
      if (!roomId) return

      rooms.value = rooms.value.filter((existingRoom) => existingRoom.id !== roomId)
      delete messagesByRoom.value[roomId]
      clearRemoteTypingTimeout(roomId)
      delete remoteTypingByRoom.value[roomId]

      if (pendingLeaveRoomId.value === roomId) {
        pendingLeaveRoomId.value = ''
      }

      if (activeRoom.value?.id === roomId) {
        activeRoom.value = null
        messages.value = []
      }
    }

    const handleRoomLeftResponse = (payload) => {
      const room = payload?.room || payload
      const roomId = room?.roomId || room?.id

      if (!roomId) return

      const participantIds = getParticipantIds(room?.participants)
      const didRequestLeave = pendingLeaveRoomId.value === roomId
      const currentUserRemoved = participantIds.length > 0 && !participantIds.includes(currentUserId.value)

      if (!didRequestLeave && !currentUserRemoved) {
        return
      }

      removeRoomFromLocalState(roomId)
    }

    const handleRoomDeletedResponse = (payload) => {
      const roomId =
        payload?.room?.roomId ||
        payload?.room?.id ||
        payload?.roomId ||
        payload?.deletedRoomId ||
        payload?.id ||
        pendingLeaveRoomId.value

      removeRoomFromLocalState(roomId)
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

      if (
        data && typeof data === 'object' &&
        (data.type === 'MESSAGES_FETCHED' || data.action === 'MESSAGES_FETCHED' || data.method === 'MESSAGES_FETCHED' || data.messages)
      ) {
        handleMessagesFetched(data)
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
          data.type === 'ROOM_LEFT' ||
          data.action === 'ROOM_LEFT' ||
          data.method === 'ROOM_LEFT' ||
          data.type === 'roomLeft' ||
          data.action === 'roomLeft' ||
          data.method === 'roomLeft'
        ) {
          handleRoomLeftResponse(data)
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

      if (data && typeof data === 'object') {
        if (
          data.type === 'ROOM_DELETED' ||
          data.action === 'ROOM_DELETED' ||
          data.method === 'ROOM_DELETED' ||
          data.type === 'roomDeleted' ||
          data.action === 'roomDeleted' ||
          data.method === 'roomDeleted'
        ) {
          handleRoomDeletedResponse(data)
        }
      }

      if (data && typeof data === 'object') {
        if (
          data.type === 'USER_IS_TYPING' ||
          data.action === 'USER_IS_TYPING' ||
          data.method === 'USER_IS_TYPING' ||
          data.type === 'userIsTyping' ||
          data.action === 'userIsTyping' ||
          data.method === 'userIsTyping'
        ) {
          if (data.userId && data.userId === currentUserId.value) {
            return
          }

          const roomId = data.roomId || activeRoom.value?.id
          if (!roomId) {
            return
          }

          setRemoteTypingState(roomId, Boolean(data.isTyping))
        }
      }

      if (parsedUsers.length > 0) {
        users.value = parsedUsers
          .filter((user) => !isCurrentUser(user))
          .map((user) => ({
            username: user.username || 'Unknown',
            lastSeen: user.lastSeen || '',
            userId: user.userId || user.id || user.username,
            status: (user.status || 'OFFLINE').toUpperCase()
          }))
      }
    }

    const selectRoom = (room) => {
      stopTyping()
      activeRoom.value = room
      messages.value = [...sortRoomMessages(room.id)]
      room.unreadCount = 0
    }

    const sendMessage = () => {
      const content = messageInput.value.trim()
      if (!content || !activeRoom.value) return

      stopTyping()

      const message = {
        id: `temp-${Date.now()}`,
        roomId: activeRoom.value.id,
        userId: currentUserId.value,
        sender: currentUsername.value,
        content,
        timestamp: new Date().toISOString(),
        deliveryStatus: 'pending'
      }

      getRoomMessages(activeRoom.value.id).push(message)
      sortRoomMessages(activeRoom.value.id)
      syncActiveRoomMessages(activeRoom.value.id)
      messageInput.value = ''
      const sendResult = websocketService.sendMessage(activeRoom.value.id, content)
      if (sendResult?.queued) {
        message.deliveryStatus = 'queued'
        syncActiveRoomMessages(activeRoom.value.id)
      }
      scrollToBottom()
    }

    const createDirectRoom = (user) => {
      if (isCreatingDirectRoom.value) return
      isCreatingDirectRoom.value = true
      pendingDirectTargetUserId.value = user.userId
      websocketService.createRoom(user.userId)
    }

    const createGroupRoom = () => {
      if (isCreatingGroupRoom.value) return
      if (!newGroupName.value.trim() || selectedGroupUsers.value.length === 0) return

      isCreatingGroupRoom.value = true
      websocketService.createGroupRoom(newGroupName.value.trim(), selectedGroupUsers.value)
    }

    const leaveRoom = () => {
      stopTyping()
      if (activeRoom.value) {
        pendingLeaveRoomId.value = activeRoom.value.id
        websocketService.leaveRoom(activeRoom.value.id)
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
      if (status === 'pending' || status === 'queued') return '🕒'
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
        websocketService.getRooms()
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error)
      }
    })

    onUnmounted(() => {
      stopTyping()
      clearAllRemoteTypingTimeouts()
      if (messageRefreshTimeoutId) {
        clearTimeout(messageRefreshTimeoutId)
        messageRefreshTimeoutId = null
      }
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
      activeRoomIsRemoteTyping,
      currentUserId,
      selectRoom,
      sendMessage,
      createDirectRoom,
      createGroupRoom,
      leaveRoom,
      openDirectModal,
      openGroupModal,
      requestUsers,
      handleTyping,
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
  position: relative;
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

.discussion-badge {
  position: absolute;
  right: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #25d366;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.35rem;
}

.chat-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  min-height: 0;
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
  min-height: 0;
  max-height: calc(100vh - 260px);
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
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
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
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  border-top: 1px solid #d9e1ea;
  background: #fff;
}

.typing-indicator {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #5e6f83;
  background: #eef3f9;
  border: 1px solid #d6e0ec;
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
}

.typing-dots {
  display: inline-flex;
  gap: 0.2rem;
}

.typing-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #6e7f93;
  display: inline-block;
  animation: typing-bounce 1s infinite ease-in-out;
}

.typing-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }

  40% {
    transform: translateY(-2px);
    opacity: 1;
  }
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
