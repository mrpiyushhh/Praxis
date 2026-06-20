/**
 * Modals Module — New Project (with color picker) + Archive
 */
import { getState } from '../core/state.js'
import { createProject, projectNameExists } from '../features/projects.js'
import { restoreTask, permanentlyDeleteArchivedTask, clearCompletedTasks } from '../features/tasks.js'
import { renderSidebar } from './sidebar.js'
import { renderTasksList } from './taskList.js'
import { renderStats } from './stats.js'
import { PROJECT_COLORS, restartMainContentAnimations, showToast } from '../utils/helpers.js'

let selectedColor = PROJECT_COLORS[0]

export function showNewProjectModal() {
  const modal = document.getElementById('new-project-modal')
  if (!modal) return
  modal.classList.remove('hidden')
  modal.classList.add('flex')

  renderColorSwatches()

  setTimeout(() => {
    const input = document.getElementById('project-name-input')
    if (input) { input.focus(); input.select() }
  }, 80)
}

export function hideNewProjectModal() {
  const modal = document.getElementById('new-project-modal')
  const input = document.getElementById('project-name-input')
  if (input) {
    input.value = ''
    input.classList.remove('!border-rose-500')
  }
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
}

function renderColorSwatches() {
  const container = document.getElementById('color-swatches')
  if (!container) return
  container.innerHTML = ''

  PROJECT_COLORS.forEach(color => {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = `w-9 h-9 rounded-2xl border-2 transition-all ${selectedColor === color ? 'border-white scale-110' : 'border-transparent hover:border-white/60'}`
    swatch.style.backgroundColor = color
    swatch.onclick = () => {
      selectedColor = color
      renderColorSwatches()
    }
    container.appendChild(swatch)
  })
}

export async function createProjectFromModal() {
  const input = document.getElementById('project-name-input')
  const name = input?.value?.trim()
  if (!name) {
    input?.classList.add('!border-rose-500')
    setTimeout(() => input?.classList.remove('!border-rose-500'), 900)
    return
  }

  if (projectNameExists(name)) {
    input?.classList.add('!border-rose-500')
    showToast('A project with that name already exists')
    setTimeout(() => input?.classList.remove('!border-rose-500'), 1400)
    return
  }

  const project = await createProject(name, selectedColor)

  // Clear input + errors before hiding (hideNewProjectModal also cleans, but explicit is safe)
  if (input) {
    input.value = ''
    input.classList.remove('!border-rose-500')
  }

  hideNewProjectModal()

  // Select it immediately
  window.currentProjectId = project.id
  window.currentSearch = ''

  renderSidebar()
  renderTasksList()
  renderStats()
  restartMainContentAnimations()
}

export function showArchiveModal() {
  const modal = document.getElementById('archive-modal')
  if (!modal || !window.currentProjectId) return
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  renderArchiveList()
}

export function hideArchiveModal() {
  const modal = document.getElementById('archive-modal')
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
}

function renderArchiveList() {
  const container = document.getElementById('archive-list')
  const countEl = document.getElementById('archive-count')
  if (!container || !window.currentProjectId) return

  const state = getState()
  const archived = (state.tasks[window.currentProjectId] || []).filter(t => t.completed)

  if (countEl) countEl.textContent = `${archived.length} task${archived.length !== 1 ? 's' : ''}`
  container.innerHTML = ''

  if (archived.length === 0) {
    container.innerHTML = `
      <div class="px-8 py-12 text-center text-on-surface-variant/70">
        <span class="material-symbols-outlined text-3xl mb-4 block">archive</span>
        <p>No archived tasks yet.</p>
      </div>
    `
    return
  }

  archived.forEach(task => {
    const row = document.createElement('div')
    row.className = `flex items-center gap-4 px-5 py-3.5 mx-2 my-1 rounded-2xl group`
    row.style.cssText = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); transform: translate3d(0, 0, 0.1px); transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;'
    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,0.08)'; row.style.borderColor = 'rgba(255,255,255,0.16)' })
    row.addEventListener('mouseleave', () => { row.style.background = 'rgba(255,255,255,0.05)'; row.style.borderColor = 'rgba(255,255,255,0.1)' })

    row.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="text-sm ${task.completed ? 'line-through opacity-60' : ''}">${task.title}</div>
        <div class="flex items-center gap-3 text-[10px] text-on-surface-variant/60 mt-1">
          <span>${task.priority || 'low'} priority</span>
          ${task.dueDate ? `<span>${task.dueDate}</span>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-2 opacity-80 group-hover:opacity-100">
        <button class="restore-btn text-xs px-4 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300 transition-colors">Restore</button>
        <button class="delete-btn text-xs px-3 py-1.5 rounded-xl bg-rose-900/50 hover:bg-rose-900 text-rose-300 transition-colors">
          <span class="material-symbols-outlined text-base align-middle">delete</span>
        </button>
      </div>
    `

    row.querySelector('.restore-btn').onclick = async () => {
      await restoreTask(task.id)
      renderArchiveList()
      renderTasksList()
      renderSidebar()
      renderStats()
    }
    row.querySelector('.delete-btn').onclick = async () => {
      if (confirm('Delete this archived task forever?')) {
        await permanentlyDeleteArchivedTask(task.id)
        renderArchiveList()
        renderTasksList()
        renderSidebar()
      }
    }

    container.appendChild(row)
  })
}

// Wire backdrop clicks + static buttons
export function initModals() {
  // New project modal
  const np = document.getElementById('new-project-modal')
  if (np) {
    np.onclick = (e) => { if (e.target.id === 'new-project-modal') hideNewProjectModal() }
  }

  // Archive modal
  const am = document.getElementById('archive-modal')
  if (am) {
    am.onclick = (e) => { if (e.target.id === 'archive-modal') hideArchiveModal() }
  }

  // Wire create button if present
  const createBtn = document.querySelector('#new-project-modal .create-project-btn')
  if (createBtn) createBtn.onclick = createProjectFromModal

  // Enter key support + live error clearing for new project input
  const nameInput = document.getElementById('project-name-input')
  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        createProjectFromModal()
      }
    })
    nameInput.addEventListener('input', () => {
      nameInput.classList.remove('!border-rose-500')
    })
  }

  // Close buttons
  document.querySelectorAll('.close-new-project-modal').forEach(b => b.onclick = hideNewProjectModal)
  document.querySelectorAll('.close-archive-modal').forEach(b => b.onclick = hideArchiveModal)
}
