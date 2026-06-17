/**
 * Authentication module
 * Currently handles local-only accounts with data isolation.
 * Designed to be easily swappable with Firebase/Supabase later.
 */

import { getItem, setItem, removeItem, STORAGE_KEYS, getUserDataKey } from './storage.js'

let currentUser = null

export function getUsers() {
  return getItem(STORAGE_KEYS.USERS, [])
}

export function saveUsers(users) {
  setItem(STORAGE_KEYS.USERS, users)
}

function hashPassword(password) {
  // Demo-only hashing. Replace with proper auth later.
  return btoa(unescape(encodeURIComponent(password + 'praxis-salt-2025')))
}

export function getCurrentUser() {
  const userId = getItem(STORAGE_KEYS.CURRENT_USER_ID)
  if (!userId) return null

  if (userId === 'guest') {
    return { id: 'guest', name: 'Guest', email: null }
  }

  const users = getUsers()
  return users.find(u => u.id === userId) || null
}

export function setCurrentUser(userId) {
  if (userId) {
    setItem(STORAGE_KEYS.CURRENT_USER_ID, userId)
  } else {
    removeItem(STORAGE_KEYS.CURRENT_USER_ID)
  }
}

export function signup(name, email, password) {
  const users = getUsers()
  const normalizedEmail = email.toLowerCase().trim()

  if (users.some(u => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists')
  }

  const newUser = {
    id: 'user_' + Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  }

  users.push(newUser)
  saveUsers(users)

  // Initialize empty data for new user
  const initialData = { projects: [], tasks: {} }
  setItem(getUserDataKey(newUser.id), initialData)

  currentUser = { id: newUser.id, name: newUser.name, email: newUser.email }
  setCurrentUser(newUser.id)

  return currentUser
}

export function login(email, password) {
  const users = getUsers()
  const normalizedEmail = email.toLowerCase().trim()
  const user = users.find(u => u.email === normalizedEmail)

  if (!user || user.passwordHash !== hashPassword(password)) {
    throw new Error('Invalid email or password')
  }

  currentUser = { id: user.id, name: user.name, email: user.email }
  setCurrentUser(user.id)

  return currentUser
}

export function loginAsGuest() {
  currentUser = { id: 'guest', name: 'Guest', email: null }
  setCurrentUser('guest')

  // Ensure guest has data
  if (!getItem(getUserDataKey('guest'))) {
    setItem(getUserDataKey('guest'), { projects: [], tasks: {} })
  }

  return currentUser
}

export function logout() {
  currentUser = null
  removeItem(STORAGE_KEYS.CURRENT_USER_ID)
}

export function changePassword(oldPassword, newPassword) {
  const user = getCurrentUser()
  if (!user || user.id === 'guest') {
    throw new Error('Guest users cannot change password')
  }

  const users = getUsers()
  const userIdx = users.findIndex(u => u.id === user.id)
  
  if (userIdx < 0) throw new Error('User not found')
  
  if (users[userIdx].passwordHash !== hashPassword(oldPassword)) {
    throw new Error('Current password is incorrect')
  }

  users[userIdx].passwordHash = hashPassword(newPassword)
  saveUsers(users)
  return true
}

export function getCurrentUserSync() {
  return currentUser
}

// Initialize on load
export function initAuth() {
  currentUser = getCurrentUser()
  return currentUser
}
