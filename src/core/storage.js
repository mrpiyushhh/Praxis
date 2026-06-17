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

// Use VITE_API_URL environment variable if it exists (for production), otherwise use localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

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
export async function apiGet(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || `API GET failed: ${response.statusText}`)
  }
  return response.json()
}

export async function apiPost(endpoint, data) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || `API POST failed: ${response.statusText}`)
  }
  return response.json()
}

export async function apiDelete(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || `API DELETE failed: ${response.statusText}`)
  }
  return response.json()
}

// User-specific data helpers
export function getUserDataKey(userId) {
  return userId === 'guest' ? STORAGE_KEYS.GUEST_DATA : `praxis-data-${userId}`
}

export { STORAGE_KEYS }
