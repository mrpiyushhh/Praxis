/**
 * Application state management
 * Central store for projects and tasks with backend persistence.
 */

import { getItem, setItem, getUserDataKey, apiGet, apiPost, apiDelete } from './storage.js'
import { getCurrentUserSync } from './auth.js'
import { isTaskOverdue, getLocalDateString } from '../utils/helpers.js'

let state = {
  projects: [],
  tasks: {}
}

export function getState() {
  return state
}

export function setState(newState) {
  state = JSON.parse(JSON.stringify(newState))
  saveState()
}

export async function loadUserData(userId) {
  const key = getUserDataKey(userId)

  // 1. Hydrate from local cache IMMEDIATELY — zero wait
  const cached = getItem(key, { projects: [], tasks: {} })
  state.projects = cached.projects || []
  state.tasks = cached.tasks || {}

  // 2. Sync from API in the background — update and re-render when done
  apiGet(`/projects/${userId}`)
    .then(projects => apiGet(`/tasks/${userId}`).then(allTasks => ({ projects, allTasks })))
    .then(({ projects, allTasks }) => {
      state.projects = projects
      state.tasks = {}

      allTasks.forEach(task => {
        if (!state.tasks[task.projectId]) state.tasks[task.projectId] = []
        state.tasks[task.projectId].push(task)
      })

      state.projects.forEach(p => {
        if (!state.tasks[p.id]) state.tasks[p.id] = []
      })

      saveState()
      // Refresh the UI silently with the latest server data
      window.dispatchEvent(new CustomEvent('praxis-refresh'))
    })
    .catch(err => {
      console.warn('[State] Background API sync failed, using cached data:', err)
    })

  return state
}

export function saveState() {
  const user = getCurrentUserSync()
  if (!user) return
  const key = getUserDataKey(user.id)
  setItem(key, state)
}

// --- Projects ---
export async function addProject(project) {
  const user = getCurrentUserSync()
  if (!user) return project

  // Optimistic update
  state.projects.unshift(project)
  state.tasks[project.id] = []
  saveState()

  // Background API call
  apiPost('/projects', { ...project, userId: user.id })
    .then(savedProject => {
      const idx = state.projects.findIndex(p => p.id === project.id)
      if (idx >= 0) {
        state.projects[idx] = savedProject
        saveState()
      }
    })
    .catch(err => {
      console.error('[State] Failed to add project to API', err)
    })

  return project
}

export async function deleteProject(projectId) {
  const user = getCurrentUserSync()
  if (!user) return

  // Optimistic update
  state.projects = state.projects.filter(p => p.id !== projectId)
  delete state.tasks[projectId]
  saveState()

  // Background API call
  apiDelete(`/projects/${user.id}/${projectId}`)
    .catch(err => {
      console.error('[State] Failed to delete project from API', err)
    })
}

export async function renameProject(projectId, newName) {
  const user = getCurrentUserSync()
  if (!user) return null

  const project = state.projects.find(p => p.id === projectId)
  if (!project) return null

  // Optimistic update
  project.name = newName.trim()
  saveState()

  // Background API call
  apiPost('/projects', { ...project, userId: user.id })
    .then(updatedProject => {
      project.name = updatedProject.name
      saveState()
    })
    .catch(err => {
      console.error('[State] Failed to rename project on API', err)
    })

  return project.name
}

export function reorderProjects(fromIndex, toIndex) {
  const [moved] = state.projects.splice(fromIndex, 1)
  state.projects.splice(toIndex, 0, moved)
  saveState()
  // Reordering might need a specialized API endpoint or bulk update if we want persistence
}

// --- Tasks ---
export function getActiveTasks(projectId, searchTerm = '') {
  if (!projectId) return []
  let tasks = (state.tasks[projectId] || []).filter(t => !t.completed)

  if (searchTerm) {
    const q = searchTerm.toLowerCase()
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q))
  }

  tasks.sort((a, b) => {
    // Overdue tasks always come first (above high priority)
    const aOver = isTaskOverdue(a) ? 1 : 0
    const bOver = isTaskOverdue(b) ? 1 : 0
    if (aOver !== bOver) return bOver - aOver

    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const pa = priorityOrder[a.priority] || 1
    const pb = priorityOrder[b.priority] || 1
    if (pb !== pa) return pb - pa

    const da = a.dueDate ? new Date(a.dueDate) : null
    const db = b.dueDate ? new Date(b.dueDate) : null
    if (da && db) return da - db
    if (da) return -1
    if (db) return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  return tasks
}

export function getArchivedTasks(projectId) {
  if (!projectId) return []
  return (state.tasks[projectId] || []).filter(t => t.completed)
}

export function getAllTasks(projectId) {
  if (!projectId) return []
  return state.tasks[projectId] || []
}

export function getUrgentTasks() {
  const allUrgent = []
  
  const todayStr = getLocalDateString()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = getLocalDateString(tomorrow)

  for (const projectId in state.tasks) {
    const tasks = state.tasks[projectId]
    tasks.forEach(task => {
      if (task.completed) return

      const isOverdue = isTaskOverdue(task)
      const isToday = task.dueDate === todayStr
      const isTomorrow = task.dueDate === tomorrowStr
      const isHighPrio = task.priority === 'high'

      if (isOverdue || isToday || isTomorrow || isHighPrio) {
        allUrgent.push({ ...task, projectId })
      }
    })
  }
  return allUrgent
}

export function getProjectProgress(projectId) {
  const tasks = state.tasks[projectId] || []
  if (tasks.length === 0) return 0
  const done = tasks.filter(t => t.completed).length
  return Math.round((done / tasks.length) * 100)
}

export async function addTask(projectId, task) {
  const user = getCurrentUserSync()
  if (!user) return task

  // Optimistic update
  if (!state.tasks[projectId]) state.tasks[projectId] = []
  state.tasks[projectId].unshift(task)
  saveState()

  // Background API call
  apiPost('/tasks', { ...task, projectId, userId: user.id })
    .then(savedTask => {
      const idx = state.tasks[projectId].findIndex(t => t.id === task.id)
      if (idx >= 0) {
        state.tasks[projectId][idx] = savedTask
        saveState()
        window.dispatchEvent(new CustomEvent('praxis-refresh'))
      }
    })
    .catch(err => {
      console.error('[State] Failed to add task to API', err)
    })

  return task
}

export async function updateTask(projectId, taskId, updates) {
  const user = getCurrentUserSync()
  if (!user) return null

  const tasks = state.tasks[projectId] || []
  const task = tasks.find(t => t.id === taskId)
  if (!task) return null

  // Optimistic update
  Object.assign(task, updates)
  saveState()

  // Background API call
  apiPost('/tasks', { ...task, userId: user.id })
    .then(updatedTask => {
      Object.assign(task, updatedTask)
      saveState()
      window.dispatchEvent(new CustomEvent('praxis-refresh'))
    })
    .catch(err => {
      console.error('[State] Failed to update task on API', err)
    })

  return task
}

export async function deleteTask(projectId, taskId) {
  const user = getCurrentUserSync()
  if (!user) return

  // Optimistic update
  if (state.tasks[projectId]) {
    state.tasks[projectId] = state.tasks[projectId].filter(t => t.id !== taskId)
    saveState()
  }

  // Background API call
  apiDelete(`/tasks/${user.id}/${taskId}`)
    .catch(err => {
      console.error('[State] Failed to delete task from API', err)
    })
}

export function reorderTasks(projectId, fromIndex, toIndex) {
  const tasks = state.tasks[projectId] || []
  const [moved] = tasks.splice(fromIndex, 1)
  tasks.splice(toIndex, 0, moved)
  state.tasks[projectId] = tasks
  saveState()
}

// --- Bulk / Archive ops ---
export async function toggleTaskComplete(projectId, taskId) {
  const user = getCurrentUserSync()
  if (!user) return { wasLastActive: false }

  const tasks = state.tasks[projectId] || []
  const task = tasks.find(t => t.id === taskId)
  if (!task) return { wasLastActive: false }

  const wasCompleted = task.completed
  const updates = {
    completed: true,
    archivedAt: task.archivedAt || new Date().toISOString()
  }

  // Optimistic update
  Object.assign(task, updates)
  saveState()

  // Background API call
  apiPost('/tasks', { ...task, userId: user.id })
    .catch(err => {
      console.error('[State] Failed to toggle task complete on API', err)
    })

  const remainingActive = tasks.filter(t => !t.completed).length
  return { wasLastActive: !wasCompleted && remainingActive === 0 }
}

export async function restoreTask(projectId, taskId) {
  const user = getCurrentUserSync()
  if (!user) return

  const tasks = state.tasks[projectId] || []
  const task = tasks.find(t => t.id === taskId)
  if (!task) return

  const updates = {
    completed: false,
    archivedAt: null
  }

  // Optimistic update
  task.completed = false
  delete task.archivedAt
  saveState()

  // Background API call
  apiPost('/tasks', { ...task, ...updates, userId: user.id })
    .catch(err => {
      console.error('[State] Failed to restore task on API', err)
    })
}

export async function permanentlyDeleteTask(projectId, taskId) {
  await deleteTask(projectId, taskId)
}

export async function clearAllArchived(projectId) {
  const user = getCurrentUserSync()
  if (!user) return

  if (!state.tasks[projectId]) return
  const archivedTasks = state.tasks[projectId].filter(t => t.completed)
  
  // Optimistic update
  state.tasks[projectId] = state.tasks[projectId].filter(t => !t.completed)
  saveState()

  // Parallel delete requests in background
  Promise.all(archivedTasks.map(task =>
    apiDelete(`/tasks/${user.id}/${task.id}`).catch(err =>
      console.error(`[State] Failed to delete archived task ${task.id}`, err)
    )
  ))
}
