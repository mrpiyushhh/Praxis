/**
 * Main Application UI — Urgent Banner
 */
import { getUrgentTasks } from '../core/state.js'

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
    window.dispatchEvent(new CustomEvent('select-project', { detail: { projectId: 'urgent' } }))
  }

  mainContent.prepend(banner)
}
