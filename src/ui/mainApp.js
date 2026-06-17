/**
 * Main Application UI Controller
 * Handles rendering the main Praxis interface after authentication.
 * This will be expanded as we migrate more logic from the old monolithic script.
 */

import { getCurrentUser } from '../core/auth.js'
import { getState, loadUserData, getUrgentTasks } from '../core/state.js'

let isInitialized = false

export async function initializeMainApp() {
  if (isInitialized) return

  const user = getCurrentUser()
  if (!user) {
    console.warn('[Praxis] Cannot initialize main app without authenticated user')
    return
  }

  console.log('%c[Praxis UI] Initializing main application interface for:', 'color:#00dfc1', user.name)

  // Hide auth screen (in case it wasn't already)
  const authScreen = document.getElementById('auth-screen')
  if (authScreen) authScreen.classList.add('hidden')

  // Load the user's data
  await loadUserData(user.id)

  // TODO: Replace these with proper modular renderers
  // For now, we just ensure the existing HTML structure is visible
  const sidebar = document.querySelector('aside')
  const main = document.querySelector('main')

  if (sidebar) sidebar.style.display = ''
  if (main) main.style.display = ''

  // Render user profile in sidebar using the new structure
  renderUserProfile()

  // Show urgent banner if needed
  showUrgentBanner()

  // Placeholder: In the next step we will migrate renderSidebar(), renderMain(), etc.
  showMigrationStatus()

  isInitialized = true
}

export function showUrgentBanner() {
  const urgentTasks = getUrgentTasks()
  const existing = document.getElementById('urgent-banner')
  if (existing) existing.remove()

  // Don't show banner if there are no urgent tasks OR if we are already in the urgent view
  if (urgentTasks.length === 0 || window.currentProjectId === 'urgent') return

  const mainContent = document.querySelector('main .p-6')
  if (!mainContent) return

  const banner = document.createElement('div')
  banner.id = 'urgent-banner'
  banner.className = 'urgent-banner mb-5 group'
  banner.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(255,107,129,0.12); border: 1px solid rgba(255,107,129,0.2)">
        <span class="material-symbols-outlined text-[18px]" style="color: #ff6b81; font-variation-settings:'FILL' 1">priority_high</span>
      </div>
      <div>
        <h4 class="text-[13px] font-bold" style="color: #ff6b81">${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's' : ''} need attention</h4>
        <p class="text-[11px] mt-0.5" style="color: rgba(255,107,129,0.55)">Overdue or high priority for today</p>
      </div>
    </div>
    <div class="flex items-center gap-2 flex-shrink-0">
      <span class="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all" style="background: rgba(255,107,129,0.12); color: #ff6b81; border: 1px solid rgba(255,107,129,0.2)">
        Focus now →
      </span>
    </div>
  `

  banner.onclick = () => {
    // We dispatch a custom event that main.js can listen to
    window.dispatchEvent(new CustomEvent('select-project', { detail: { projectId: 'urgent' } }))
  }

  mainContent.prepend(banner)
}

function renderUserProfile() {
  const user = getCurrentUser()
  if (!user) return

  // Remove any previous profile section
  const existing = document.getElementById('user-profile-section')
  if (existing) existing.remove()

  const sidebar = document.querySelector('aside')
  if (!sidebar) return

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const profileHTML = `
    <div id="user-profile-section" class="mt-auto border-t border-white/10 px-4 pt-4 pb-2">
      <div class="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/5 border border-white/5">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-tertiary flex items-center justify-center text-on-primary text-sm font-bold flex-shrink-0">
          ${initials}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium truncate">${user.name}</div>
          ${user.email ? `<div class="text-[10px] text-on-surface-variant/50 truncate">${user.email}</div>` : ''}
        </div>
        <button id="logout-btn" 
                class="text-on-surface-variant/50 hover:text-error p-1.5 transition-colors" 
                title="Log out">
          <span class="material-symbols-outlined text-xl">logout</span>
        </button>
      </div>
    </div>
  `

  const newProjectArea = sidebar.querySelector('.mt-auto')
  if (newProjectArea) {
    newProjectArea.insertAdjacentHTML('beforebegin', profileHTML)
  } else {
    sidebar.insertAdjacentHTML('beforeend', profileHTML)
  }

  // Wire logout
  const logoutBtn = document.getElementById('logout-btn')
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      // We will import logout from auth when we fully wire it
      if (confirm('Log out of Praxis?')) {
        window.location.reload() // Temporary until full logout is wired
      }
    }
  }
}

function showMigrationStatus() {
  // Temporary visual indicator while we migrate the rest of the app
  const mainContent = document.querySelector('main .p-6')
  if (mainContent && !document.getElementById('migration-banner')) {
    const banner = document.createElement('div')
    banner.id = 'migration-banner'
    banner.className = 'mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-on-surface-variant/70'
    banner.innerHTML = `
      <strong class="text-primary">Migration in progress</strong> — 
      Using new modular architecture (Vite + ES modules). 
      Full task/project rendering coming in next steps.
    `
    // mainContent.prepend(banner)
  }
}

export function showAuthScreen() {
  const authScreen = document.getElementById('auth-screen')
  if (authScreen) authScreen.classList.remove('hidden')
}
