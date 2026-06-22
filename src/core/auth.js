/**
 * Authentication module
 * Now uses real backend API endpoints with JWT tokens.
 */

import { getItem, setItem, removeItem, STORAGE_KEYS, getUserDataKey, apiPost } from './storage.js'

let currentUser = null

export function getCurrentUser() {
  const userId = getItem(STORAGE_KEYS.CURRENT_USER_ID)
  const token = getItem(STORAGE_KEYS.AUTH_TOKEN)
  if (!userId || !token) return null

  // We only store basic info locally now, the real source of truth is the backend
  const users = getItem(STORAGE_KEYS.USERS, [])
  return users.find(u => u.id === userId) || { id: userId, name: 'User' }
}

export function setCurrentUser(user, token) {
  if (user && token) {
    setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id)
    setItem(STORAGE_KEYS.AUTH_TOKEN, token)
    
    // Save minimal info locally for quick retrieval
    const users = getItem(STORAGE_KEYS.USERS, [])
    const existingIdx = users.findIndex(u => u.id === user.id)
    if (existingIdx >= 0) {
      users[existingIdx] = user
    } else {
      users.push(user)
    }
    setItem(STORAGE_KEYS.USERS, users)
  } else {
    removeItem(STORAGE_KEYS.CURRENT_USER_ID)
    removeItem(STORAGE_KEYS.AUTH_TOKEN)
  }
}

export async function signup(name, email, password) {
  const normalizedEmail = email.toLowerCase().trim()
  
  const response = await apiPost('/auth/signup', { name, email: normalizedEmail, password })
  
  currentUser = response.user
  setCurrentUser(response.user, response.token)

  return currentUser
}

export async function login(email, password) {
  const normalizedEmail = email.toLowerCase().trim()
  
  const response = await apiPost('/auth/login', { email: normalizedEmail, password })
  
  currentUser = response.user
  setCurrentUser(response.user, response.token)

  return currentUser
}

export async function loginAsGuest() {
  // Create a temporary guest account on the backend
  const randomSuffix = Math.floor(Math.random() * 1000000)
  const guestName = 'Guest User'
  const guestEmail = `guest${randomSuffix}@praxis-demo.local`
  const guestPassword = `guest_pass_${randomSuffix}`

  return await signup(guestName, guestEmail, guestPassword)
}

export function logout() {
  currentUser = null
  setCurrentUser(null, null)
}

export async function changePassword(oldPassword, newPassword) {
  throw new Error('Changing password via API is not yet implemented.')
}

export function getCurrentUserSync() {
  return currentUser
}

// Initialize on load
export function initAuth() {
  currentUser = getCurrentUser()
  return currentUser
}
