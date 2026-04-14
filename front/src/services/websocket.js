import authService from './auth'

class WebSocketService {
  constructor() {
    this.ws = null
    this.url = 'wss://xizfuecqnl.execute-api.eu-west-3.amazonaws.com/dev/'
    this.userId = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
    this.listeners = {}
    this.shouldReconnect = false
  }

  connect(userId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (userId && this.userId !== userId) {
        this.userId = userId
      }
      return Promise.resolve()
    }

    this.userId = userId || this.userId
    this.shouldReconnect = true

    return new Promise((resolve, reject) => {
      try {
        const token = authService.getAccessToken()
        const wsUrl = token ? `${this.url}?token=${token}` : this.url
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          if (this.userId) {
            this.send({ action: 'connect' })
          }
          this.emit('connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          this.emit('message', data)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.emit('error', error)
          reject(error)
        }

        this.ws.onclose = () => {
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
      setTimeout(() => this.connect(this.userId).catch(console.error), delay)
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.error('WebSocket is not connected')
    }
  }

  listUsers() {
    this.send({ action: 'listUsers' })
  }

  leaveRoom(roomId) {
    this.send({ action: 'leaveRoom', roomId })
  }

  sendMessage(roomId, content) {
    this.send({ action: 'sendMessage', roomId, content })
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

    if (this.ws) {
      const disconnectUserId = userId || this.userId
      if (disconnectUserId && this.ws.readyState === WebSocket.OPEN) {
        this.send({ action: 'disconnect', userId: disconnectUserId })
      }
      this.ws.close()
      this.ws = null
    }

    this.userId = null
  }
}

export default new WebSocketService()
