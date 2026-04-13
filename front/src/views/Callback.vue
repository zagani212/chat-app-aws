<template>
  <div class="callback-container">
    <div class="callback-card">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
      <div v-else-if="error" class="error-section">
        <h2>Authentication Error</h2>
        <p class="error-message">{{ error }}</p>
        <button @click="retry" class="btn btn-retry">Retry</button>
        <router-link to="/" class="btn btn-home">Go Home</router-link>
      </div>
      <div v-else class="success-section">
        <h2>Authentication Successful!</h2>
        <p>Redirecting to chat...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import authService from '../services/auth'

export default {
  name: 'Callback',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const loading = ref(true)
    const loadingMessage = ref('Processing authentication...')
    const error = ref('')

    const handleCallback = async () => {
      try {
        const code = route.query.code
        const errorCode = route.query.error
        const errorDescription = route.query.error_description

        if (errorCode) {
          throw new Error(`Cognito Error: ${errorDescription || errorCode}`)
        }

        if (!code) {
          throw new Error('No authorization code received from Cognito')
        }

        loadingMessage.value = 'Exchanging code for token...'

        const success = await authService.exchangeCodeForToken(code)

        if (!success) {
          throw new Error('Failed to exchange code for token')
        }

        loadingMessage.value = 'Authentication successful! Redirecting...'

        setTimeout(() => {
          router.push({ name: 'Chat' })
        }, 1000)
      } catch (err) {
        console.error('Callback error:', err)
        error.value = err.message || 'An error occurred during authentication'
        loading.value = false
      }
    }

    const retry = () => {
      error.value = ''
      loading.value = true
      handleCallback()
    }

    onMounted(() => {
      handleCallback()
    })

    return { loading, loadingMessage, error, retry }
  }
}
</script>

<style scoped>
.callback-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: calc(100vh - 80px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.callback-card {
  background: white;
  padding: 3rem 2rem;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading p {
  color: #667eea;
  font-weight: 500;
}

.error-section, .success-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-section h2, .success-section h2 {
  color: #2c3e50;
  margin: 0;
}

.error-message {
  color: #c33;
  background-color: #ffe6e6;
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid #c33;
}

.success-section h2 {
  color: #27ae60;
}

.success-section p {
  color: #27ae60;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.btn-retry {
  background-color: #667eea;
  color: white;
}

.btn-retry:hover {
  background-color: #5568d3;
}

.btn-home {
  background-color: #95a5a6;
  color: white;
}

.btn-home:hover {
  background-color: #7f8c8d;
}
</style>
