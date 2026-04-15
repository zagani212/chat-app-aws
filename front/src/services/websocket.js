import authService from './auth'

class WebSocketService {
  constructor() {
    this.ws = null
    this.url = 'wss://xizfuecqnl.execute-api.eu-west-3.amazonaws.com/dev/'
    this.userId = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.reconnectTimeoutId = null
    this.connectionVersion = 0
    this.listeners = {}
    this.shouldReconnect = false
    this.offlineQueue = []

    this.handleBrowserOnline = () => {
      if (!this.shouldReconnect) return
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
      this.connect(this.userId).catch(console.error)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleBrowserOnline)
    }
  }

  getQueueStorageKey() {
    return `chat-app:offline-outbox:${this.userId || 'anonymous'}`
  }

  loadOfflineQueue() {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(this.getQueueStorageKey())
      const parsed = raw ? JSON.parse(raw) : []
      this.offlineQueue = Array.isArray(parsed) ? parsed : []
    } catch {
      this.offlineQueue = []
    }
  }

  persistOfflineQueue() {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(this.getQueueStorageKey(), JSON.stringify(this.offlineQueue))
    } catch {
      // Ignore storage write failures to avoid blocking chat usage.
    }
  }

  enqueueOfflineAction(data) {
    if (!data || data.action !== 'sendMessage') return

    this.offlineQueue.push({
      ...data,
      queuedAt: new Date().toISOString(),
      clientQueueId: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    })
    this.persistOfflineQueue()
    this.emit('message-queued', data)
  }

  flushOfflineQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    if (this.offlineQueue.length === 0) return

    const remaining = []
    let sentCount = 0

    for (const queuedAction of this.offlineQueue) {
      try {
        this.ws.send(JSON.stringify(queuedAction))
        sentCount++
      } catch {
        remaining.push(queuedAction)
      }
    }

    this.offlineQueue = remaining
    this.persistOfflineQueue()

    if (sentCount > 0) {
      this.emit('offline-queue-flushed', { sentCount, remainingCount: remaining.length })
    }
  }

  clearReconnectTimer() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
  }

  closeCurrentSocket() {
    if (!this.ws) return

    const socket = this.ws
    this.ws = null

    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null

    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close()
    }
  }

  connect(userId) {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.closeCurrentSocket()
    }

    this.userId = userId || this.userId
    this.loadOfflineQueue()
    this.shouldReconnect = true
    this.clearReconnectTimer()

    const connectionVersion = ++this.connectionVersion

    return new Promise((resolve, reject) => {
      try {
        const token = authService.getAccessToken()
        const wsUrl = token ? `${this.url}?token=${token}` : this.url
        const socket = new WebSocket(wsUrl)
        this.ws = socket

        socket.onopen = () => {
          if (connectionVersion !== this.connectionVersion) return
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          if (this.userId) {
            this.send({ action: 'connect' })
          }
          this.flushOfflineQueue()
          this.emit('connected')
          resolve()
        }

        socket.onmessage = (event) => {
          if (connectionVersion !== this.connectionVersion) return
          const data = JSON.parse(event.data)
          this.emit('message', data)
        }

        socket.onerror = (error) => {
          if (connectionVersion !== this.connectionVersion) return
          console.error('WebSocket error:', error)
          this.emit('error', error)
          reject(error)
        }

        socket.onclose = () => {
          if (connectionVersion !== this.connectionVersion) return
          console.log('WebSocket disconnected')
          this.emit('disconnected')
          if (this.shouldReconnect) {
            this.attemptReconnect()
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`Attempting to reconnect in ${delay}ms...`)
      this.clearReconnectTimer()
      this.reconnectTimeoutId = setTimeout(() => {
        this.reconnectTimeoutId = null
        this.connect(this.userId).catch(console.error)
      }, delay)
    }
  }

  send(data, options = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
      return { sent: true, queued: false }
    } else {
      console.error('WebSocket is not connected')
      if (options.queueIfOffline) {
        this.enqueueOfflineAction(data)
        return { sent: false, queued: true }
      }
      return { sent: false, queued: false }
    }
  }

  listUsers() {
    this.send({ action: 'listUsers' })
  }

  leaveRoom(roomId) {
    this.send({ action: 'leaveRoom', roomId })
  }

  sendMessage(roomId, content) {
    return this.send({ action: 'sendMessage', roomId, content }, { queueIfOffline: true })
  }

  isTyping(roomId, isTyping) {
    this.send({
      action: 'isTyping',
      roomId,
      isTyping
    })
  }

  getRooms() {
    this.send({ action: 'getRooms' })
  }

  getMessages() {
    this.send({ action: 'getMessages' })
  }

  createRoom(targetUserId) {
    this.send({
      action: 'createRoom',
      userIds: targetUserId ? [targetUserId] : []
    })
  }

  createGroupRoom(name, userIds) {
    this.send({
      action: 'createRoom',
      name,
      userIds: Array.isArray(userIds) ? userIds : []
    })
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback)
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data))
    }
  }

  disconnect(userId) {
    this.shouldReconnect = false
    this.clearReconnectTimer()
    this.connectionVersion++

    if (this.ws) {
      const disconnectUserId = userId || this.userId
      if (disconnectUserId && this.ws.readyState === WebSocket.OPEN) {
        this.send({ action: 'disconnect', userId: disconnectUserId })
      }
      this.closeCurrentSocket()
    }

    this.userId = null
  }
}

export default new WebSocketService()
