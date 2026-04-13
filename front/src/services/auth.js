import Cookies from 'js-cookie'
import axios from 'axios'
import websocketService from './websocket'

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_EXPIRES_KEY = 'auth_expires'
const REFRESH_TOKEN_KEY = 'refresh_token'

class AuthService {
  constructor() {
    this.cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN
    this.region = import.meta.env.VITE_COGNITO_REGION
    this.clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
    this.redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI
    this.scopes = 'openid email profile'
  }

  getLoginUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: this.scopes,
      redirect_uri: this.redirectUri
    })
    return `https://${this.cognitoDomain}.auth.${this.region}.amazoncognito.com/oauth2/authorize?${params.toString()}`
  }

  getLogoutUrl() {
    const logoutUri = import.meta.env.VITE_COGNITO_LOGOUT_URI || `${window.location.origin}/signin`
    const params = new URLSearchParams({
      client_id: this.clientId,
      logout_uri: logoutUri
    })
    return `https://${this.cognitoDomain}.auth.${this.region}.amazoncognito.com/logout?${params.toString()}`
  }

  login() {
    window.location.href = this.getLoginUrl()
  }

  async exchangeCodeForToken(code) {
    try {
      const tokenEndpoint = `https://${this.cognitoDomain}.auth.${this.region}.amazoncognito.com/oauth2/token`
      const payload = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri
      })

      const response = await axios.post(tokenEndpoint, payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const {
        access_token: accessToken,
        id_token: idToken,
        refresh_token: refreshToken,
        expires_in: expiresIn
      } = response.data

      this.setTokens(accessToken, idToken, refreshToken, expiresIn)

      return true
    } catch (error) {
      console.error('Token exchange failed:', error)
      return false
    }
  }

  setTokens(accessToken, idToken, refreshToken, expiresIn) {
    const expirationDate = new Date(Date.now() + expiresIn * 1000)
    Cookies.set(AUTH_TOKEN_KEY, accessToken, { expires: expirationDate })
    Cookies.set('id_token', idToken, { expires: expirationDate })
    if (refreshToken) {
      Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 7 })
    }
    Cookies.set(AUTH_EXPIRES_KEY, expirationDate.getTime().toString())
  }

  getAccessToken() {
    return Cookies.get(AUTH_TOKEN_KEY)
  }

  getIdToken() {
    return Cookies.get('id_token')
  }

  isAuthenticated() {
    const token = this.getAccessToken()
    if (!token) return false
    const expiresAt = Cookies.get(AUTH_EXPIRES_KEY)
    if (!expiresAt) return false
    return parseInt(expiresAt) > Date.now()
  }

  logout() {
    const userInfo = this.getUserInfo()
    Cookies.remove(AUTH_TOKEN_KEY)
    Cookies.remove("cognito")
    Cookies.remove("csrf-state")
    Cookies.remove("csrf-state-legacy")
    Cookies.remove("id_token")
    Cookies.remove("lang")
    Cookies.remove("XSRF-TOKEN")
    Cookies.remove(REFRESH_TOKEN_KEY)
    Cookies.remove(AUTH_EXPIRES_KEY)
    
    websocketService.disconnect(userInfo?.sub)

    window.location.href = this.getLogoutUrl()
  }

  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Failed to decode token:', error)
      return null
    }
  }

  getUserInfo() {
    const idToken = this.getIdToken()
    if (!idToken) return null
    return this.decodeToken(idToken)
  }
}

export default new AuthService()
