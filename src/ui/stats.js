/**
 * Stats row renderer (Progress ring + counts + archive button)
 */
import { getState, getProjectProgress, getArchivedTasks } from '../core/state.js'
import { showArchiveModal } from './modals.js'

export function renderStats() {
  const container = document.getElementById('stats-row')
  if (!container || !window.currentProjectId) return

  const state = getState()
  const project = state.projects.find(p => p.id === window.currentProjectId)
  if (!project) return

  const allTasks = state.tasks[window.currentProjectId] || []
  const progress = getProjectProgress(window.currentProjectId)
  const completedCount = allTasks.filter(t => t.completed).length
  const archived = getArchivedTasks(window.currentProjectId)

  const ringRadius = 38
  const ringCircumference = 2 * Math.PI * ringRadius
  const progressRingOffset = ringCircumference - (ringCircumference * progress / 100)

  // Progress color based on completion
  const progressColor = progress >= 80 ? '#34d399' : progress >= 40 ? '#a078ff' : '#60a5fa'

  container.innerHTML = `
    <!-- Progress Card -->
    <div class="col-span-12 lg:col-span-8 stat-card flex items-center gap-6 stagger-1 relative overflow-hidden">
      <div class="absolute inset-0 opacity-[0.03]" style="background: radial-gradient(circle at 80% 50%, ${progressColor}, transparent 60%)"></div>
      
      <!-- Ring -->
      <div class="relative w-[88px] h-[88px] flex-shrink-0">
        <svg class="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" fill="transparent" r="${ringRadius}" 
                  stroke="rgba(255,255,255,0.06)" stroke-width="7"></circle>
          <circle cx="48" cy="48" fill="transparent" r="${ringRadius}" 
                  stroke="${progressColor}" stroke-dasharray="${ringCircumference}" 
                  stroke-dashoffset="${progressRingOffset}" 
                  stroke-linecap="round" stroke-width="7"
                  style="filter: drop-shadow(0 0 6px ${progressColor}60); transition: stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)"></circle>
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-[11px] font-bold" style="color: ${progressColor}">${progress}%</span>
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <p class="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.15em] mb-1">Progress</p>
        <div class="flex items-baseline gap-1.5 mb-2">
          <span class="text-4xl font-bold text-on-surface leading-none">${progress}</span>
          <span class="text-xl font-bold text-on-surface-variant/30">%</span>
        </div>
        <!-- Progress bar -->
        <div class="h-1.5 rounded-full bg-white/[0.06] overflow-hidden w-full max-w-[180px]">
          <div class="h-full rounded-full transition-all duration-700" 
               style="width: ${progress}%; background: ${progressColor}; box-shadow: 0 0 8px ${progressColor}60"></div>
        </div>
        <p class="text-[11px] text-on-surface-variant/40 mt-1.5">${completedCount} of ${allTasks.length} tasks done</p>
      </div>
    </div>

    <!-- Archive Card -->
    <button data-action="show-archive"
            class="col-span-12 lg:col-span-4 stat-card flex flex-col justify-between hover:border-white/15 transition-all text-left stagger-2 group cursor-pointer">
      <div class="flex items-center justify-between mb-3">
        <p class="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.15em]">Archive</p>
        <div class="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
          <span class="material-symbols-outlined text-[14px] text-on-surface-variant/40 group-hover:text-on-surface-variant/70 transition-colors" style="font-variation-settings:'FILL' 1">archive</span>
        </div>
      </div>
      <div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-4xl font-bold text-on-surface leading-none">${archived.length}</span>
          <span class="text-[11px] text-on-surface-variant/40 font-medium">tasks</span>
        </div>
        <p class="text-[10px] text-tertiary/60 mt-1 group-hover:text-tertiary/80 transition-colors">View archive →</p>
      </div>
    </button>
  `

  // Wire archive button
  const archiveBtn = container.querySelector('[data-action="show-archive"]')
  if (archiveBtn) {
    archiveBtn.onclick = () => showArchiveModal()
  }
}
