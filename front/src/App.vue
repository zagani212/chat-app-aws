<template>
  <div id="app" class="app-container">
    <nav class="navbar" v-if="isAuthenticated && $route.name !== 'SignIn'">
      <div class="navbar-brand"><h1>Chat App</h1></div>
      <div class="navbar-menu">
        <span class="user-info">{{ userEmail }}</span>
        <button @click="logout" class="btn-logout">Logout</button>
      </div>
    </nav>
    <main class="main-content"><RouterView /></main>
  </div>
</template>

<script>
import { RouterView } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import authService from './services/auth'

export default {
  name: 'App',
  components: { RouterView },
  setup() {
    const userEmail = ref('')
    const isAuthenticated = computed(() => authService.isAuthenticated())

    onMounted(() => {
      const userInfo = authService.getUserInfo()
      if (userInfo) {
        userEmail.value = userInfo.email || ''
      }
    })

    const logout = () => {
      authService.logout()
    }

    return { isAuthenticated, userEmail, logout }
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.navbar {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar-brand h1 {
  margin: 0;
  font-size: 1.5rem;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  font-size: 0.9rem;
  color: #ecf0f1;
}

.btn-logout {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.btn-logout:hover {
  background-color: #c0392b;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}
</style>
