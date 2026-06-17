/**
 * Storage layer - handles all localStorage operations
 * This abstraction will make it easy to switch to a backend later.
 */

const STORAGE_KEYS = {
  USERS: 'praxis-users',
  CURRENT_USER_ID: 'praxis-current-user-id',
  GUEST_DATA: 'praxis-guest-data',
  AUTH_TOKEN: 'praxis-auth-token'
}

// Production: set VITE_API_URL to your deployed backend (e.g. https://api.example.com/api)
// Development: Vite proxies /api → http://localhost:5001
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeItem(key) {
  localStorage.removeItem(key)
}

function getAuthHeaders() {
  const token = getItem(STORAGE_KEYS.AUTH_TOKEN, null)
  return token 
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } 
    : { 'Content-Type': 'application/json' }
}

// API Helpers
async function handleResponse(response, method) {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || `API ${method} failed: ${response.statusText}`)
  }
  return response.json()
}

async function apiFetch(url, options, method) {
  let response
  try {
    response = await fetch(url, options)
  } catch {
    throw new Error('Cannot reach the API server. Run `npm run dev` to start the frontend and backend together.')
  }
  return handleResponse(response, method)
}

export async function apiGet(endpoint) {
  return apiFetch(`${API_BASE_URL}${endpoint}`, { headers: getAuthHeaders() }, 'GET')
}

export async function apiPost(endpoint, data) {
  return apiFetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  }, 'POST')
}

export async function apiDelete(endpoint) {
  return apiFetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }, 'DELETE')
}

// User-specific data helpers
export function getUserDataKey(userId) {
  return userId === 'guest' ? STORAGE_KEYS.GUEST_DATA : `praxis-data-${userId}`
}

export { STORAGE_KEYS }
