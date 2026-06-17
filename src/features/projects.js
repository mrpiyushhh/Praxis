/**
 * Projects Feature Module
 */
import {
  getState,
  addProject as coreAddProject,
  deleteProject as coreDeleteProject,
  renameProject as coreRename,
  reorderProjects
} from '../core/state.js'
import { generateId } from '../utils/helpers.js'

export async function createProject(name, color) {
  const state = getState()

  const newProject = {
    id: generateId('proj'),
    name: name.trim(),
    color: color || '#6366f1',
    createdAt: new Date().toISOString()
  }

  return await coreAddProject(newProject)
}

export async function deleteProject(projectId) {
  await coreDeleteProject(projectId)
}

export async function renameProject(projectId, newName) {
  return await coreRename(projectId, newName)
}

export function reorderProject(fromIndex, toIndex) {
  reorderProjects(fromIndex, toIndex)
}

export function getProjectById(projectId) {
  const state = getState()
  return state.projects.find(p => p.id === projectId) || null
}

export function projectNameExists(name) {
  if (!name) return false
  const state = getState()
  const normalized = name.trim().toLowerCase()
  return state.projects.some(p => p.name.trim().toLowerCase() === normalized)
}
