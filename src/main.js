/**
 * Praxis — Clean Modular Entry Point
 */
import './styles/main.css'

import { initAuth, login, signup, loginAsGuest, logout, changePassword, getCurrentUser } from './core/auth.js'
import { loadUserData, getState, saveState } from './core/state.js'

import { renderSidebar, initProjectListDrop, updateHeader } from './ui/sidebar.js'
import { renderTasksList } from './ui/taskList.js'
import { renderStats } from './ui/stats.js'
import { initModals, showNewProjectModal, hideNewProjectModal, hideArchiveModal } from './ui/modals.js'
import { initDatePicker, openDatePicker, closeDatePicker } from './ui/datePicker.js'

import { showUrgentBanner } from './ui/mainApp.js'

import { addNewTask } from './features/tasks.js'
import { createProject } from './features/projects.js'

import { triggerConfetti, showToast, PROJECT_COLORS, restartMainContentAnimations, getLocalDateString } from './utils/helpers.js'

// --- App state ---
let currentUser = null
let newTaskDueDate = null

// Make things available globally for the UI modules to interact with
window.currentProjectId = null
window.currentSearch = ''
window.newTaskPriority = 'low'

// ============================================
// AUTH
// ============================================
function toggleAuthUI(isAuthenticated) {
  const authScreen = document.getElementById('auth-screen')
  const sidebar = document.getElementById('sidebar')
  const mainContent = document.getElementById('main-content')
  const profileFab = document.getElementById('profile-fab')

  if (isAuthenticated) {
    authScreen?.classList.add('hidden')
    sidebar?.classList.remove('hidden')
    mainContent?.classList.remove('hidden')
    profileFab?.classList.remove('hidden')
  } else {
    authScreen?.classList.remove('hidden')
    sidebar?.classList.add('hidden')
    mainContent?.classList.add('hidden')
    profileFab?.classList.add('hidden')
  }
}

async function initializeAuth() {
  currentUser = initAuth()

  if (currentUser) {
    toggleAuthUI(true)
    await loadUserData(currentUser.id)
    startApplication()
  } else {
    toggleAuthUI(false)
    setupAuthForms()
  }
}

function setupAuthForms() {
  // Tabs
  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.authTab
      const loginForm = document.getElementById('auth-login-form')
      const signupForm = document.getElementById('auth-signup-form')
      const loginTab = document.getElementById('auth-tab-login')
      const signupTab = document.getElementById('auth-tab-signup')

      if (tab === 'login') {
        loginForm?.classList.remove('hidden')
        signupForm?.classList.add('hidden')
        loginTab?.classList.add('active')
        signupTab?.classList.remove('active')
      } else {
        loginForm?.classList.add('hidden')
        signupForm?.classList.remove('hidden')
        loginTab?.classList.remove('active')
        signupTab?.classList.add('active')
      }
    })
  })

  // Login
  document.querySelector('.login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value
    const pass = document.getElementById('login-password').value
    if (!email || !pass) return showToast('Please fill in all fields')
    
    try {
      currentUser = await login(email, pass)
      toggleAuthUI(true)
      await loadUserData(currentUser.id)
      startApplication()
    } catch (e) { showToast(e.message) }
  })

  // Signup
  document.querySelector('.signup-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('signup-name').value
    const email = document.getElementById('signup-email').value
    const pass = document.getElementById('signup-password').value
    const confirm = document.getElementById('signup-confirm').value
    
    if (!name || !email || !pass) return showToast('Please fill in all fields')
    if (pass !== confirm) return showToast('Passwords do not match')
    
    try {
      currentUser = await signup(name, email, pass)
      toggleAuthUI(true)
      await loadUserData(currentUser.id)
      startApplication()
    } catch (e) { showToast(e.message) }
  })

  // Guest
  document.querySelectorAll('.guest-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        currentUser = await loginAsGuest()
        toggleAuthUI(true)
        await loadUserData(currentUser.id)
        startApplication()
      } catch (e) { showToast(e.message) }
    })
  })
}

// ============================================
// MAIN APPLICATION
// ============================================
function startApplication() {
  console.log('%c[Praxis] Starting clean modular dashboard...', 'color:#00dfc1')

  try {
    let state = getState()

    // Seed nice demo data for brand new guests
    if (currentUser?.id === 'guest' && (!state.projects || state.projects.length === 0)) {
      seedDemoData()
      state = getState()
    }

    // Set initial current project
    if (state.projects?.length > 0 && !window.currentProjectId) {
      window.currentProjectId = state.projects[0].id
    }

    // Initial render
    renderEverything()

    // Render the 3D Profile FAB
    updateProfileFAB()

    // Wire everything
    wireAppEvents()

    // Init advanced modules
    initDatePicker()
    initModals()
    initProjectListDrop()

    // Keyboard shortcuts
    setupKeyboardShortcuts()

    console.log('%c[Praxis] Dashboard ready (fully modular).', 'color:#69f0ae')
  } catch (err) {
    console.error('[Praxis] Startup error:', err)
    showToast('Error starting Praxis. Check console.')
  }
}

function renderEverything() {
  const isUrgent = window.currentProjectId === 'urgent'
  
  // Hide/Show dashboard elements based on view
  const statsRow = document.getElementById('stats-row')
  const taskInput = document.getElementById('task-input-card')
  const activeHeader = document.getElementById('active-tasks-header')
  const taskListContainer = document.getElementById('task-list-container')

  if (isUrgent) {
    if (statsRow) statsRow.style.display = 'none'
    if (taskInput) taskInput.style.display = 'none'
    if (activeHeader) activeHeader.style.display = 'none'
    if (taskListContainer) {
      taskListContainer.className = 'grid grid-cols-1 lg:grid-cols-3 gap-5 stagger-6'
    }
  } else {
    if (statsRow) statsRow.style.display = ''
    if (taskInput) taskInput.style.display = ''
    if (activeHeader) activeHeader.style.display = ''
    if (taskListContainer) {
      taskListContainer.className = 'glass-card-elevated rounded-2xl overflow-hidden border border-white/[0.06] min-h-[280px] stagger-6'
    }
  }

  renderSidebar()
  renderTasksList()
  renderStats()
  updateHeader()
  showUrgentBanner()
}

function seedDemoData() {
  const todayStr = getLocalDateString()
  
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStr = getLocalDateString(yesterdayDate)

  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = getLocalDateString(tomorrowDate)

  const demoProject = {
    id: 'proj_' + Date.now(),
    name: 'Website Launch',
    color: PROJECT_COLORS[0],
    createdAt: new Date().toISOString()
  }
  
  const demoTasks = [
    { id: 't1', title: '⚠️ Overdue Task', completed: false, priority: 'high', dueDate: yesterdayStr, createdAt: new Date(Date.now() - 1000*60*60*48).toISOString() },
    { id: 't2', title: 'Task due Today', completed: false, priority: 'medium', dueDate: todayStr, createdAt: new Date(Date.now() - 1000*60*60*26).toISOString() },
    { id: 't3', title: '🔥 High Priority Task', completed: false, priority: 'high', dueDate: tomorrowStr, createdAt: new Date(Date.now() - 1000*60*60*47).toISOString() },
    { id: 't4', title: 'Task due Tomorrow', completed: false, priority: 'low', dueDate: tomorrowStr, createdAt: new Date(Date.now() - 1000*60*60*71).toISOString() },
  ]

  const state = getState()
  state.projects = [demoProject]
  state.tasks = { [demoProject.id]: demoTasks }
  saveState()
  window.currentProjectId = demoProject.id
}

async function handleAddTask() {
  const input = document.getElementById('new-task-input')
  if (input?.value.trim() && window.currentProjectId) {
    await addNewTask(input.value.trim(), window.newTaskPriority, newTaskDueDate)
    input.value = ''
    newTaskDueDate = null
    updateDeadlineDisplay()
    updateAddTaskButtonState()
    renderEverything()
  }
}

function updateAddTaskButtonState() {
  const input = document.getElementById('new-task-input')
  const btn = document.querySelector('.add-task-btn')
  if (input && btn) {
    btn.disabled = !input.value.trim()
  }
}

function wireAppEvents() {
  // Global refresh event
  window.addEventListener('praxis-refresh', () => {
    renderEverything()
  })

  // Select project event
  window.addEventListener('select-project', (e) => {
    window.currentProjectId = e.detail.projectId
    window.currentSearch = ''
    const searchInput = document.getElementById('search-input')
    if (searchInput) searchInput.value = ''
    
    renderEverything()
    restartMainContentAnimations()
  })

  // New task input (Enter)
  const input = document.getElementById('new-task-input')
  if (input) {
    input.addEventListener('input', updateAddTaskButtonState)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleAddTask()
      }
    })
  }

  // Add button
  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', handleAddTask)
  })

  // New Project button
  document.querySelectorAll('.new-project-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showNewProjectModal()
      closeMobileSidebar()
    })
  })

  // Delete project button (header)
  const delBtn = document.querySelector('.delete-project-btn')
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      if (!window.currentProjectId) return
      const state = getState()
      const proj = state.projects.find(p => p.id === window.currentProjectId)
      if (!proj || !confirm(`Delete project "${proj.name}"?`)) return

      await deleteProject(window.currentProjectId)

      window.currentProjectId = state.projects[0]?.id || null
      renderEverything()
      restartMainContentAnimations()
    })
  }

  // Priority pills
  document.querySelectorAll('[data-priority]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.newTaskPriority = btn.dataset.priority
      updatePriorityUI()
    })
  })

  // Deadline button
  const deadlineBtn = document.querySelector('.deadline-btn')
  if (deadlineBtn) {
    deadlineBtn.addEventListener('click', (e) => {
      e.stopImmediatePropagation()
      openDatePicker(newTaskDueDate, (date) => {
        newTaskDueDate = date
        updateDeadlineDisplay()
      })
    })
  }

  // Search
  const search = document.getElementById('search-input')
  if (search) {
    search.addEventListener('input', () => {
      window.currentSearch = search.value
      renderTasksList()
    })
  }

  // Profile FAB Click
  const fab = document.getElementById('profile-fab')
  if (fab) {
    fab.addEventListener('click', showProfileModal)
  }

  // Profile Modal Close
  document.querySelector('.close-profile-modal')?.addEventListener('click', hideProfileModal)
  document.getElementById('profile-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'profile-modal') hideProfileModal()
  })

  // Logout
  document.getElementById('profile-logout-btn')?.addEventListener('click', () => {
    if (confirm('Log out of Praxis?')) {
      logout()
      location.reload()
    }
  })

  // Change Password
  document.getElementById('change-password-btn')?.addEventListener('click', () => {
    const oldPass = document.getElementById('old-password').value
    const newPass = document.getElementById('new-password').value
    if (!oldPass || !newPass) return showToast('Please fill in both fields')
    
    try {
      changePassword(oldPass, newPass)
      showToast('Password changed successfully!')
      document.getElementById('old-password').value = ''
      document.getElementById('new-password').value = ''
    } catch (e) {
      showToast(e.message)
    }
  })

  // Sidebar Toggle — button lives inside the sidebar header
  const toggleBtn = document.getElementById('sidebar-toggle-btn')
  const backdrop = document.getElementById('sidebar-backdrop')

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebar)
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar)
  }

  // On mobile, close sidebar when a project is selected
  const projectList = document.getElementById('project-list')
  if (projectList) {
    projectList.addEventListener('click', (e) => {
      const row = e.target.closest('[data-project-id]')
      if (row && window.innerWidth < 1024) {
        setTimeout(closeSidebar, 50)
      }
    })
  }

  // Initial state sync
  updatePriorityUI()
  updateDeadlineDisplay()
  updateAddTaskButtonState()
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar')
  if (!sidebar) return

  if (window.innerWidth < 1024) {
    // Mobile: slide in/out as before
    const isHidden = sidebar.classList.contains('-translate-x-full')
    if (isHidden) openSidebar()
    else closeSidebar()
  } else {
    // Desktop: collapse to rail / expand
    const isCollapsed = sidebar.classList.contains('collapsed')
    if (isCollapsed) expandSidebar()
    else collapseSidebar()
  }
}

function collapseSidebar() {
  const sidebar = document.getElementById('sidebar')
  const main = document.getElementById('main-content')
  if (!sidebar) return

  sidebar.classList.add('collapsed')
  main?.classList.remove('sidebar-open')
  main?.classList.add('sidebar-rail')
}

function expandSidebar() {
  const sidebar = document.getElementById('sidebar')
  const main = document.getElementById('main-content')
  if (!sidebar) return

  sidebar.classList.remove('collapsed')
  main?.classList.remove('sidebar-rail')
  main?.classList.add('sidebar-open')
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar')
  const backdrop = document.getElementById('sidebar-backdrop')

  if (!sidebar) return
  sidebar.classList.remove('-translate-x-full')
  backdrop?.classList.remove('hidden')
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar')
  const backdrop = document.getElementById('sidebar-backdrop')

  if (!sidebar) return
  sidebar.classList.add('-translate-x-full')
  backdrop?.classList.add('hidden')
}

// Keep old export name so other modules that call it still work
export function closeMobileSidebar() {
  if (window.innerWidth < 1024) closeSidebar()
}

function updatePriorityUI() {
  document.querySelectorAll('[data-priority]').forEach(b => {
    b.classList.remove('bg-tertiary/10', 'border', 'border-tertiary/20', 'text-tertiary', 'text-error', 'text-secondary', 'bg-white/10')
    if (b.dataset.priority === window.newTaskPriority) {
      if (b.dataset.priority === 'high') b.classList.add('text-error', 'bg-white/10')
      if (b.dataset.priority === 'medium') b.classList.add('text-secondary', 'bg-white/10')
      if (b.dataset.priority === 'low') b.classList.add('text-tertiary', 'bg-tertiary/10', 'border', 'border-tertiary/20')
    } else {
      b.classList.add('text-on-surface-variant/60')
    }
  })
}

function updateDeadlineDisplay() {
  const display = document.getElementById('new-task-deadline-display')
  if (!display) return

  if (newTaskDueDate) {
    const d = new Date(newTaskDueDate)
    const today = new Date()
    today.setHours(0,0,0,0)
    const diff = Math.round((d - today) / (1000*60*60*24))
    let text = newTaskDueDate
    if (diff < 0) text = 'Overdue'
    else if (diff === 0) text = 'Today'
    else if (diff === 1) text = 'Tomorrow'
    else text = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    display.innerHTML = `
      <span class="text-primary font-medium">${text}</span>
      <span class="ml-1.5 text-on-surface-variant/50 hover:text-error cursor-pointer" data-clear-deadline>×</span>
    `
    display.querySelector('[data-clear-deadline]')?.addEventListener('click', (ev) => {
      ev.stopImmediatePropagation()
      newTaskDueDate = null
      updateDeadlineDisplay()
    })
  } else {
    display.textContent = 'Add deadline'
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Focus search
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      const search = document.getElementById('search-input')
      search?.focus()
      search?.select()
    }
    
    // Close modals / clear search
    if (e.key === 'Escape') {
      const search = document.getElementById('search-input')
      if (search && document.activeElement === search) {
        window.currentSearch = ''
        search.value = ''
        renderTasksList()
      } else {
        hideNewProjectModal()
        hideArchiveModal()
        closeDatePicker()
        hideProfileModal()
        closeMobileSidebar()
      }
    }
  })
}

function updateProfileFAB() {
  const user = getCurrentUser()
  const fab = document.getElementById('profile-fab')
  if (!user || !fab) return

  fab.classList.remove('hidden')
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  
  fab.querySelector('.initials').textContent = initials
}

function showProfileModal() {
  const user = getCurrentUser()
  const modal = document.getElementById('profile-modal')
  if (!user || !modal) return

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  document.getElementById('profile-modal-initials').textContent = initials
  document.getElementById('profile-modal-name').textContent = user.name
  document.getElementById('profile-modal-email').textContent = user.email || 'Guest User'
  
  const pwSection = document.getElementById('password-change-section')
  if (user.id === 'guest') {
    pwSection.classList.add('hidden')
  } else {
    pwSection.classList.remove('hidden')
  }

  modal.classList.remove('hidden')
  modal.classList.add('flex')
}

function hideProfileModal() {
  const modal = document.getElementById('profile-modal')
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
}

// Boot
initializeAuth()

// Remove stagger animation classes after completion to fix Chrome's backdrop-filter rendering bug
document.addEventListener('animationend', (e) => {
  const target = e.target
  if (!target) return
  const classes = Array.from(target.classList)
  const staggerClass = classes.find(c => c.startsWith('stagger-'))
  if (staggerClass) {
    target.classList.remove(staggerClass)
  }
})

