<template>
  <div class="signin-container">
    <div class="signin-card">
      <h2>Sign In to Chat App</h2>
      <p>Sign in with your AWS Cognito account to start chatting</p>
      <button @click="handleSignIn" class="btn btn-signin" :disabled="loading">
        <span v-if="!loading">Sign In with AWS Cognito</span>
        <span v-else>Redirecting...</span>
      </button>
      <div v-if="error" class="error-message">{{ error }}</div>
      <p class="signin-info">You will be redirected to AWS Cognito to complete your authentication.</p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import authService from '../services/auth'

export default {
  name: 'SignIn',
  setup() {
    const loading = ref(false)
    const error = ref('')

    const handleSignIn = () => {
      loading.value = true
      error.value = ''
      try {
        authService.login()
      } catch (err) {
        error.value = 'Failed to initiate sign in. Please try again.'
        loading.value = false
        console.error('Sign in error:', err)
      }
    }

    return { loading, error, handleSignIn }
  }
}
</script>

<style scoped>
.signin-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: calc(100vh - 80px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.signin-card {
  background: white;
  padding: 3rem 2rem;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.signin-card h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
}

.signin-card p {
  color: #7f8c8d;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-signin {
  background-color: #f39c12;
  color: white;
  margin-bottom: 1.5rem;
}

.btn-signin:hover:not(:disabled) {
  background-color: #e67e22;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.4);
}

.btn-signin:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  background-color: #ffe6e6;
  color: #c33;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  border-left: 4px solid #c33;
}

.signin-info {
  color: #95a5a6;
  font-size: 0.85rem;
  margin-top: 1.5rem;
  font-style: italic;
}
</style>
