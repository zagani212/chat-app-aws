<template>
  <div class="home-container">
    <div class="welcome-section">
      <h2>Welcome to Chat App</h2>
      <p>A real-time chat application powered by AWS</p>
      <div class="cta-buttons">
        <button @click="navigateToSignIn" class="btn btn-primary">Sign In</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import authService from '../services/auth'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()

    const navigateToSignIn = () => {
      if (authService.isAuthenticated()) {
        router.push({ name: 'Chat' })
      } else {
        authService.login()
      }
    }

    return { navigateToSignIn }
  }
}
</script>

<style scoped>
.home-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: calc(100vh - 80px);
}

.welcome-section {
  text-align: center;
  max-width: 500px;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.welcome-section h2 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.welcome-section p {
  font-size: 1.1rem;
  color: #7f8c8d;
  margin-bottom: 2rem;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}
</style>
