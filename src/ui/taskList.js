/**
 * Task List UI Module — Fully self-contained with event delegation
 */
import { getState, getActiveTasks, getUrgentTasks, saveState } from '../core/state.js'
import {
  toggleTask, cycleTaskPriority, deleteTask, editTaskTitle, editTaskDueDate
} from '../features/tasks.js'
import { openDatePicker } from './datePicker.js'
import { formatDueDate, timeAgo, triggerConfetti, showToast, isTaskOverdue, getLocalDateString, getPriorityColor, getPriorityBg } from '../utils/helpers.js'

let draggedTaskEl = null

/**
 * Dispatch a single event that main.js already listens for,
 * instead of manually calling renderSidebar + renderStats + renderTasksList everywhere.
 */
function refreshAll() {
  window.dispatchEvent(new CustomEvent('praxis-refresh'))
}

export function renderTasksList() {
  const container = document.getElementById('task-list-container')
  if (!container) return

  const projectId = window.currentProjectId
  const searchTerm = window.currentSearch || ''

  // Update active count
  const activeCountEl = document.getElementById('active-count')
  
  let filtered = []
  if (projectId === 'urgent') {
    filtered = getUrgentTasks()
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q))
    }
  } else {
    filtered = getActiveTasks(projectId, searchTerm)
  }

  if (activeCountEl) activeCountEl.textContent = filtered.length

  container.innerHTML = ''

  if (projectId === 'urgent') {
    // Only add the entrance animation when first switching into focus view
    const isFirstRender = container.dataset.view !== 'urgent'
    container.dataset.view = 'urgent'
    container.className = 'grid grid-cols-1 lg:grid-cols-3 gap-5' + (isFirstRender ? ' stagger-6' : '')
    renderTimeGroupedTasks(container, filtered)
  } else {
    const isFirstRender = container.dataset.view !== projectId
    container.dataset.view = projectId || ''
    container.className = 'glass-card-elevated rounded-2xl overflow-hidden border border-white/[0.1] min-h-[280px]' + (isFirstRender ? ' stagger-6' : '')
    
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="px-8 py-20 flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
            <span class="material-symbols-outlined text-[30px] text-on-surface-variant/20" style="font-variation-settings:'FILL' 0, 'wght' 200">check_circle</span>
          </div>
          <p class="text-on-surface-variant/50 text-[14px] font-medium">
            ${searchTerm ? 'No tasks match your search' : 'Nothing here yet — add your first task above'}
          </p>
          ${!searchTerm ? `<p class="text-on-surface-variant/25 text-[12px] mt-1.5">Tasks you add will appear here</p>` : ''}
        </div>
      `
      return
    }

    filtered.forEach((task, index) => {
      container.appendChild(createTaskElement(task, index, projectId))
    })
  }

  // Single delegated listener for the whole list
  if (!container._delegated) {
    container._delegated = true
    container.addEventListener('click', handleTaskClick)
  }
}

function renderTimeGroupedTasks(container, tasks) {
  const todayStr = getLocalDateString()
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = getLocalDateString(tomorrowDate)

  const overdue = tasks.filter(t => isTaskOverdue(t))
  const dueToday = tasks.filter(t => t.dueDate === todayStr)
  const dueTomorrow = tasks.filter(t => t.dueDate === tomorrowStr)

  // Look up all projects once for the focus cards
  const state = getState()
  const projectsMap = Object.fromEntries(state.projects.map(p => [p.id, p]))

  container.appendChild(createFocusColumn('Overdue', overdue, '#ff6b81', 'running_with_errors', projectsMap))
  container.appendChild(createFocusColumn('Today', dueToday, '#fbbf24', 'today', projectsMap))
  container.appendChild(createFocusColumn('Tomorrow', dueTomorrow, '#60a5fa', 'event_upcoming', projectsMap))
}

function createFocusColumn(title, tasks, color, icon, projectsMap) {
  const col = document.createElement('div')
  col.className = 'focus-column min-w-0'
  
  const emptyState = tasks.length === 0 ? `
    <div class="flex flex-col items-center justify-center py-10 opacity-30">
      <span class="material-symbols-outlined text-3xl mb-2" style="color:${color}; font-variation-settings:'FILL' 0, 'wght' 200">done_all</span>
      <p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">All clear</p>
    </div>
  ` : ''

  col.innerHTML = `
    <!-- Radial Glow Mesh similar to progress stats cards -->
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background: radial-gradient(circle at 80% 20%, ${color}, transparent 60%)"></div>
    
    <div class="focus-column-header">
      <div class="flex items-center justify-between w-full">
        <p class="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.15em]">${title}</p>
        <div class="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center" style="border: 1px solid rgba(255,255,255,0.08)">
          <span class="material-symbols-outlined text-[14px]" style="color: ${color}; font-variation-settings: 'FILL' 1, 'wght' 500">${icon}</span>
        </div>
      </div>
      <div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-4xl font-bold text-on-surface leading-none">${tasks.length}</span>
          <span class="text-[11px] text-on-surface-variant/40 font-medium">task${tasks.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
    <div class="focus-column-body task-cards-container">
      ${emptyState}
    </div>
  `
  
  const cardsContainer = col.querySelector('.task-cards-container')
  tasks.forEach((task, index) => {
    cardsContainer.appendChild(createTaskCard(task, index, color, projectsMap))
  })
  
  return col
}

function createTaskCard(task, index, accentColor, projectsMap) {
  const el = document.createElement('div')
  el.className = 'task-row focus-task-card group'
  el.dataset.taskId = task.id
  el.dataset.projectId = task.projectId
  el.dataset.index = index

  const prioColor = getPriorityColor(task.priority)
  const prioBg = getPriorityBg(task.priority)
  const project = projectsMap[task.projectId]

  el.innerHTML = `
    <div class="flex items-start gap-3">
      <div data-action="toggle" 
           class="mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all hover:scale-110"
           style="border-color: rgba(255,255,255,0.2); background: transparent;"
           onmouseenter="this.style.borderColor='${accentColor || prioColor}'"
           onmouseleave="this.style.borderColor='rgba(255,255,255,0.2)'">
        <span class="material-symbols-outlined text-[10px] opacity-0 transition-all" style="color:${accentColor || prioColor}; font-variation-settings:'FILL' 1">check</span>
      </div>
      <div class="flex-1 min-w-0">
        <div data-action="edit-title" class="text-[13px] font-medium leading-snug text-on-surface mb-2.5 cursor-text hover:text-white transition-colors">
          ${task.title}
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${project ? `
          <div data-action="go-to-project" data-target-project-id="${project.id}"
               class="flex items-center gap-1 px-2 py-0.5 rounded-md shrink-0 cursor-pointer transition-all hover:brightness-125 hover:scale-105"
               style="background: ${project.color}15; border: 1px solid ${project.color}20"
               title="Go to ${project.name}">
            <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${project.color}"></div>
            <span class="text-[9px] font-bold uppercase tracking-wider truncate max-w-[72px]" style="color: ${project.color}cc">
              ${project.name}
            </span>
          </div>` : ''}
          <div data-action="cycle-priority" 
               class="flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer transition-all hover:brightness-125 shrink-0"
               style="background: ${prioBg}; border: 1px solid ${prioColor}20">
            <div class="priority-dot" style="background-color: ${prioColor}; box-shadow: 0 0 4px ${prioColor}60; width:6px; height:6px"></div>
            <span class="text-[9px] font-bold uppercase tracking-wider" style="color: ${prioColor}cc">${task.priority || 'low'}</span>
          </div>
        </div>
      </div>
      <button data-action="delete" class="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-error/10 -mt-0.5 -mr-0.5">
        <span class="material-symbols-outlined text-[16px] text-on-surface-variant/40 hover:text-error transition-colors">delete</span>
      </button>
    </div>
  `

  return el
}

function createTaskElement(task, index, currentProjectId) {
  const el = document.createElement('div')
  el.className = `task-row group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 sm:px-6 py-4 border-b border-white/[0.05] last:border-none transition-all`
  el.draggable = true
  el.dataset.taskId = task.id
  el.dataset.projectId = task.projectId || currentProjectId
  el.dataset.index = index

  const prioColor = getPriorityColor(task.priority)
  const prioBg = getPriorityBg(task.priority)
  const due = formatDueDate(task.dueDate)
  const dueBadge = due
    ? `<span data-action="edit-due" class="font-semibold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer whitespace-nowrap transition-all hover:brightness-125" style="background:${due.color}12; color:${due.color}; border: 1px solid ${due.color}25">${due.text}</span>`
    : `<span data-action="edit-due" class="font-medium px-2.5 py-1 rounded-lg text-[10px] cursor-pointer whitespace-nowrap text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors border border-transparent hover:border-white/10">+ Due date</span>`

  el.innerHTML = `
    <div class="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
      <div data-action="toggle" 
           class="mt-0.5 sm:mt-0 w-5 h-5 sm:w-[22px] sm:h-[22px] rounded-full border-2 flex-shrink-0 flex items-center justify-center cursor-pointer transition-all active:scale-90 hover:scale-110"
           style="border-color: rgba(255,255,255,0.2)">
        <span class="material-symbols-outlined text-[11px] sm:text-[13px] opacity-0 transition-all" style="font-variation-settings: 'FILL' 1; color: #34d399">check</span>
      </div>
      <div class="flex-1 min-w-0">
        <div data-action="edit-title" class="task-title text-[14px] sm:text-[14px] font-medium cursor-pointer leading-snug select-none text-on-surface/90 hover:text-on-surface pr-2 sm:pr-4 break-words transition-colors">
          ${task.title}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2 sm:gap-3 text-xs text-on-surface-variant/70 pl-8 sm:pl-0 w-full sm:w-auto justify-between sm:justify-end shrink-0 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
      <div class="flex items-center gap-2 shrink-0">
        ${dueBadge}
        <div data-action="cycle-priority" 
             class="flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg transition-all hover:brightness-125 shrink-0"
             style="background: ${prioBg}; border: 1px solid ${prioColor}20">
          <div class="priority-dot" style="background-color: ${prioColor}; box-shadow: 0 0 5px ${prioColor}50"></div>
          <span class="font-bold text-[9px] uppercase tracking-wider" style="color: ${prioColor}cc">${task.priority || 'low'}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <div class="font-mono text-[10px] text-right tabular-nums text-on-surface-variant/30 shrink-0 hidden sm:block">
          ${timeAgo(task.createdAt)}
        </div>
        <button data-action="delete" class="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-error/10">
          <span class="material-symbols-outlined text-[15px] text-on-surface-variant/30 hover:text-error transition-colors">delete</span>
        </button>
      </div>
    </div>
  `

  el.addEventListener('dragstart', (e) => {
    if (window.innerWidth < 640) {
      e.preventDefault()
      return
    }
    draggedTaskEl = el
    el.style.opacity = '0.5'
    e.dataTransfer.effectAllowed = 'move'
  })
  el.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' })
  el.addEventListener('drop', handleTaskDrop)
  el.addEventListener('dragend', () => {
    if (draggedTaskEl) draggedTaskEl.style.opacity = '1'
    draggedTaskEl = null
  })

  return el
}

async function handleTaskClick(e) {
  const row = e.target.closest('.task-row')
  if (!row) return
  const taskId = row.dataset.taskId
  const projectId = row.dataset.projectId
  const actionEl = e.target.closest('[data-action]')
  const action = actionEl?.dataset.action

  if (!action) return

  if (action === 'go-to-project') {
    const targetProjectId = actionEl.dataset.targetProjectId
    if (targetProjectId) {
      window.dispatchEvent(new CustomEvent('select-project', { detail: { projectId: targetProjectId } }))
    }
    return
  }

  if (action === 'toggle') {
    const wasLast = await toggleTask(taskId, projectId)
    refreshAll()
    if (wasLast) {
      setTimeout(() => triggerConfetti(), 180)
      showToast("All tasks complete — nice work!")
    }
  } else if (action === 'edit-title') {
    startInlineEdit(row.querySelector('[data-action="edit-title"]'), taskId, projectId)
  } else if (action === 'cycle-priority') {
    await cycleTaskPriority(taskId, projectId)
    refreshAll()
  } else if (action === 'edit-due') {
    e.stopImmediatePropagation()
    const state = getState()
    const task = (state.tasks[projectId] || []).find(t => t.id === taskId)
    openDatePicker(task?.dueDate, async (newDate) => {
      await editTaskDueDate(taskId, newDate, projectId)
      refreshAll()
    })
  } else if (action === 'delete') {
    e.stopImmediatePropagation()
    await deleteTask(taskId, projectId)
    refreshAll()
  }
}

function startInlineEdit(element, taskId, projectId) {
  const original = element.textContent.trim()
  element.contentEditable = true
  element.focus()

  const range = document.createRange()
  range.selectNodeContents(element)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)

  async function finish() {
    element.contentEditable = false
    const newTitle = element.textContent.trim()
    if (newTitle && newTitle !== original) {
      await editTaskTitle(taskId, newTitle, projectId)
    } else {
      element.textContent = original
    }
    element.removeEventListener('blur', finish)
    element.removeEventListener('keydown', onKey)
  }

  function onKey(ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); finish() }
    else if (ev.key === 'Escape') { element.textContent = original; finish() }
  }

  element.addEventListener('blur', finish, { once: true })
  element.addEventListener('keydown', onKey)
}

function handleTaskDrop(e) {
  e.preventDefault()
  const dropTarget = e.currentTarget
  if (!draggedTaskEl || draggedTaskEl === dropTarget) return

  const container = document.getElementById('task-list-container')
  const children = Array.from(container.children)
  const from = children.indexOf(draggedTaskEl)
  const to = children.indexOf(dropTarget)
  if (from < 0 || to < 0) return

  const projectId = window.currentProjectId
  if (projectId && projectId !== 'urgent') {
    const state = getState()
    const tasks = [...(state.tasks[projectId] || [])]
    const [moved] = tasks.splice(from, 1)
    tasks.splice(to, 0, moved)
    state.tasks[projectId] = tasks
    saveState()
  }
  renderTasksList()
}
