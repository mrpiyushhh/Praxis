/**
 * Sidebar UI Module — Fully self-contained
 * Renders project list + handles selection, rename, delete, drag reordering.
 */
import { getState, saveState, getUrgentTasks } from '../core/state.js'
import { deleteProject, renameProject, reorderProject } from '../features/projects.js'
import { renderTasksList } from './taskList.js'
import { renderStats } from './stats.js'
import { restartMainContentAnimations } from '../utils/helpers.js'

let draggedProjectEl = null

export function renderSidebar() {
  const container = document.getElementById('project-list')
  if (!container) return

  const state = getState()
  container.innerHTML = ''

  // --- Today's Focus Section ---
  renderUrgentSummary()

  if (!state.projects || state.projects.length === 0) {
    container.innerHTML = `
      <div class="px-4 py-6 text-center">
        <p class="text-xs text-on-surface-variant/50">No projects yet</p>
      </div>
    `
    return
  }

  const currentId = window.currentProjectId

  state.projects.forEach((project, index) => {
    const isActive = project.id === currentId

    const el = document.createElement('div')
    el.className = `project-item ${isActive ? 'active' : ''}`
    el.draggable = true
    el.dataset.projectId = project.id
    el.dataset.index = index

    el.innerHTML = `
      <div class="flex-1 min-w-0 flex items-center gap-2.5 project-item-text">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all" 
              style="background-color: ${project.color}; box-shadow: ${isActive ? `0 0 10px ${project.color}80` : `0 0 0 ${project.color}00`}"></span>
        <span class="text-[13px] font-medium truncate ${isActive ? 'text-on-surface' : 'text-on-surface-variant/70'}">${project.name}</span>
      </div>
      <!-- Rail mode: just the dot, centered -->
      <span class="project-item-dot hidden w-2.5 h-2.5 rounded-full flex-shrink-0"
            style="background-color: ${project.color}; box-shadow: ${isActive ? `0 0 10px ${project.color}80` : 'none'}"></span>
    `
    el.dataset.tooltip = project.name

    // Selection
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return
      selectProject(project.id)
    })

    // Drag & drop reordering
    el.addEventListener('dragstart', handleDragStart)
    el.addEventListener('dragover', handleDragOver)
    el.addEventListener('dragleave', handleDragLeave)
    el.addEventListener('drop', handleDrop)
    el.addEventListener('dragend', handleDragEnd)

    // Context menu style actions (right click or long press could be added later)
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      showProjectActions(project.id, el)
    })

    container.appendChild(el)
  })
}

function renderUrgentSummary() {
  const slot = document.getElementById('sidebar-focus-slot')
  if (!slot) return

  // Always clear and re-render the slot
  slot.innerHTML = ''

  const urgentTasks = getUrgentTasks()
  const isUrgentActive = window.currentProjectId === 'urgent'

  slot.innerHTML = `
    <div class="mb-4">
      <div class="sidebar-section-header flex items-center justify-between px-3 mb-2 overflow-hidden">
        <h2 class="text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-[0.25em] whitespace-nowrap">Focus</h2>
      </div>
      <div id="urgent-focus-item" 
           class="project-item ${isUrgentActive ? 'active' : ''}"
           data-tooltip="Focus">
        <div class="flex-1 min-w-0 flex items-center gap-2.5 project-item-text">
          <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" 
               style="background: #ff6b81; box-shadow: ${isUrgentActive ? '0 0 10px rgba(255,107,129,0.6)' : '0 0 4px rgba(255,107,129,0.3)'}"></div>
          <span class="text-[13px] font-medium truncate ${isUrgentActive ? 'text-on-surface' : 'text-on-surface-variant/70'} whitespace-nowrap">Focus</span>
        </div>
        <!-- Rail mode dot -->
        <span class="project-item-dot hidden w-2.5 h-2.5 rounded-full flex-shrink-0"
              style="background: #ff6b81; box-shadow: ${isUrgentActive ? '0 0 10px rgba(255,107,129,0.6)' : '0 0 4px rgba(255,107,129,0.3)'}"></span>
      </div>
    </div>
  `

  slot.querySelector('#urgent-focus-item').addEventListener('click', () => {
    selectProject('urgent')
  })
}

function selectProject(projectId) {
  window.dispatchEvent(new CustomEvent('select-project', { detail: { projectId } }))
}

function updateHeader() {
  const state = getState()
  const nameEl = document.getElementById('current-project-name')
  const colorEl = document.getElementById('top-project-color')
  const actionsEl = document.getElementById('top-actions')

  if (window.currentProjectId === 'urgent') {
    if (nameEl) nameEl.textContent = "Focus"
    if (colorEl) {
      colorEl.style.backgroundColor = '#ff6b81'
      colorEl.style.boxShadow = '0 0 8px rgba(255,107,129,0.6)'
      colorEl.classList.remove('hidden')
    }
    if (actionsEl) actionsEl.classList.add('hidden')
    return
  }

  const project = state.projects.find(p => p.id === window.currentProjectId)

  if (!project) {
    if (nameEl) nameEl.textContent = 'Select a project'
    if (colorEl) colorEl.classList.add('hidden')
    if (actionsEl) actionsEl.classList.add('hidden')
    return
  }

  if (nameEl) {
    nameEl.textContent = project.name
    nameEl.onclick = async () => {
      const newName = prompt('Rename project:', project.name)
      if (newName && newName.trim()) {
        await renameProject(project.id, newName)
        renderSidebar()
        updateHeader()
      }
    }
  }
  if (colorEl) {
    colorEl.style.backgroundColor = project.color
    colorEl.style.boxShadow = `0 0 8px ${project.color}80`
    colorEl.classList.remove('hidden')
  }
  if (actionsEl) {
    actionsEl.classList.remove('hidden')
  }
}

async function showProjectActions(projectId, el) {
  const state = getState()
  const project = state.projects.find(p => p.id === projectId)
  if (!project) return

  const action = prompt(`Project "${project.name}"\n\nType: rename | delete`, 'rename')
  if (!action) return

  if (action.toLowerCase() === 'rename') {
    const newName = prompt('New name:', project.name)
    if (newName && newName.trim()) {
      await renameProject(projectId, newName)
      renderSidebar()
      updateHeader()
    }
  } else if (action.toLowerCase() === 'delete') {
    if (confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
      await deleteProject(projectId)
      window.currentProjectId = state.projects[0]?.id || null
      renderSidebar()
      renderTasksList()
      renderStats()
      updateHeader()
    }
  }
}

// === Drag & Drop for projects ===
function handleDragStart(e) {
  draggedProjectEl = this
  this.style.opacity = '0.5'
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', this.dataset.projectId)
}

function handleDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  this.style.borderTop = '2px solid rgba(208,188,255,0.5)'
}

function handleDragLeave() {
  this.style.borderTop = ''
}

function handleDrop(e) {
  e.preventDefault()
  if (!draggedProjectEl || draggedProjectEl === this) return

  const draggedId = e.dataTransfer.getData('text/plain')
  const targetId = this.dataset.projectId
  if (draggedId === targetId) return

  const state = getState()
  const fromIndex = state.projects.findIndex(p => p.id === draggedId)
  const toIndex = state.projects.findIndex(p => p.id === targetId)
  if (fromIndex < 0 || toIndex < 0) return

  reorderProject(fromIndex, toIndex)
  renderSidebar()
}

function handleDragEnd() {
  if (draggedProjectEl) {
    draggedProjectEl.style.opacity = '1'
    draggedProjectEl.style.borderTop = ''
  }
  draggedProjectEl = null
  document.querySelectorAll('#project-list [data-project-id]').forEach(el => {
    el.style.borderTop = ''
  })
}

// Allow dropping at end of list
export function initProjectListDrop() {
  const container = document.getElementById('project-list')
  if (!container) return

  container.addEventListener('dragover', (e) => e.preventDefault())
  container.addEventListener('drop', (e) => {
    e.preventDefault()
    if (!draggedProjectEl) return
    const draggedId = e.dataTransfer.getData('text/plain')
    const state = getState()
    const fromIndex = state.projects.findIndex(p => p.id === draggedId)
    if (fromIndex < 0) return

    reorderProject(fromIndex, state.projects.length - 1)
    renderSidebar()
  })
}

export { updateHeader }
