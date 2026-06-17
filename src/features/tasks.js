/**
 * Tasks Feature Module
 * Pure business logic for tasks. No DOM, no globals.
 */
import {
  getState,
  addTask as coreAddTask,
  updateTask,
  deleteTask as coreDeleteTask,
  toggleTaskComplete,
  reorderTasks,
  restoreTask as coreRestore,
  permanentlyDeleteTask as corePermDelete,
  clearAllArchived
} from '../core/state.js'
import { generateId } from '../utils/helpers.js'

export async function addNewTask(title, priority = 'low', dueDate = null) {
  const state = getState()
  const projectId = window.currentProjectId
  if (!projectId || projectId === 'urgent') return null

  const finalDueDate = dueDate || new Date().toISOString().split('T')[0]

  const newTask = {
    id: generateId('task'),
    title: title.trim(),
    completed: false,
    priority,
    dueDate: finalDueDate,
    createdAt: new Date().toISOString()
  }

  return await coreAddTask(projectId, newTask)
}

export async function toggleTask(taskId, explicitProjectId = null) {
  const projectId = explicitProjectId || window.currentProjectId
  if (!projectId || projectId === 'urgent') return false
  const result = await toggleTaskComplete(projectId, taskId)
  return result.wasLastActive
}

export async function cycleTaskPriority(taskId, explicitProjectId = null) {
  const state = getState()
  const projectId = explicitProjectId || window.currentProjectId
  if (!projectId || projectId === 'urgent') return null

  const tasks = state.tasks[projectId] || []
  const task = tasks.find(t => t.id === taskId)
  if (!task) return null

  const order = ['low', 'medium', 'high']
  let idx = order.indexOf(task.priority || 'low')
  const next = order[(idx + 1) % 3]
  await updateTask(projectId, taskId, { priority: next })
  return next
}

export async function deleteTask(taskId, explicitProjectId = null) {
  const projectId = explicitProjectId || window.currentProjectId
  if (!projectId || projectId === 'urgent') return
  await coreDeleteTask(projectId, taskId)
}

export async function editTaskTitle(taskId, newTitle, explicitProjectId = null) {
  const projectId = explicitProjectId || window.currentProjectId
  if (!projectId || projectId === 'urgent') return null
  const trimmed = newTitle.trim()
  if (!trimmed) return null
  await updateTask(projectId, taskId, { title: trimmed })
  return trimmed
}

export async function editTaskDueDate(taskId, newDate, explicitProjectId = null) {
  const projectId = explicitProjectId || window.currentProjectId
  if (!projectId || projectId === 'urgent') return
  const value = newDate && newDate.trim() !== '' ? newDate.trim() : null
  await updateTask(projectId, taskId, { dueDate: value })
}

export async function restoreTask(taskId, explicitProjectId = null) {
  const projectId = explicitProjectId || window.currentProjectId
  if (!projectId || projectId === 'urgent') return
  await coreRestore(projectId, taskId)
}

export async function permanentlyDeleteArchivedTask(taskId, explicitProjectId = null) {
  const projectId = explicitProjectId || window.currentProjectId
  if (!projectId || projectId === 'urgent') return
  await corePermDelete(projectId, taskId)
}

export async function clearCompletedTasks(projectId) {
  if (!projectId || projectId === 'urgent') return
  await clearAllArchived(projectId)
}

export function reorderTask(projectId, fromIndex, toIndex) {
  if (projectId === 'urgent') return
  reorderTasks(projectId, fromIndex, toIndex)
}
