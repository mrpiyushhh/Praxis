/**
 * Shared pure helper functions for Praxis.
 * No DOM side effects, no globals.
 */

export const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

/**
 * Returns a YYYY-MM-DD string in the user's local timezone.
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDueDate(dueDateStr) {
  if (!dueDateStr) return null;
  const d = new Date(dueDateStr);
  const todayStr = getLocalDateString();
  
  if (dueDateStr < todayStr) return { text: 'Overdue', color: '#f43f5e', urgent: true };
  if (dueDateStr === todayStr) return { text: 'Today', color: '#f59e0b', urgent: true };
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);
  if (dueDateStr === tomorrowStr) return { text: 'Tomorrow', color: '#f59e0b', urgent: false };
  
  return { text: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), color: '#64748b', urgent: false };
}

export function isTaskOverdue(task) {
  if (!task?.dueDate) return false;
  const todayStr = getLocalDateString();
  return task.dueDate < todayStr;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 172800) return 'yesterday';
  return Math.floor(seconds / 86400) + 'd ago';
}

/** Priority color mapping */
export function getPriorityColor(priority) {
  if (priority === 'high') return '#ff6b81'
  if (priority === 'medium') return '#fbbf24'
  return '#34d399'
}

/** Priority background color mapping */
export function getPriorityBg(priority) {
  if (priority === 'high') return 'rgba(255,107,129,0.1)'
  if (priority === 'medium') return 'rgba(251,191,36,0.1)'
  return 'rgba(52,211,153,0.1)'
}

/** Simple confetti burst */
export function triggerConfetti() {
  const colors = ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b'];
  const container = document.body;

  for (let i = 0; i < 85; i++) {
    const piece = document.createElement('div');
    piece.className = 'fun-confetti';

    const size = Math.random() * 9 + 6;
    piece.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: -20px;
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.6 ? '50%' : '2px'};
      opacity: ${Math.random() * 0.7 + 0.6};
      z-index: 99999;
      pointer-events: none;
      transform: rotate(${Math.random() * 360}deg);
    `;

    container.appendChild(piece);

    const duration = Math.random() * 2400 + 2100;
    const xDrift = (Math.random() - 0.5) * 180;

    piece.animate([
      { transform: `translateY(0) rotate(0deg)`, opacity: piece.style.opacity },
      { transform: `translateY(${window.innerHeight + 80}px) translateX(${xDrift}px) rotate(${Math.random() * 600 - 200}deg)`, opacity: 0 }
    ], {
      duration,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
    }).onfinish = () => piece.remove();
  }
}

/** Lightweight toast notification */
export function showToast(message, duration = 1600) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-sm shadow-2xl flex items-center gap-2 z-[9999]`;
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.2s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 180);
  }, duration);
}

/** Generate a unique id */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Restarts a single CSS animation class on an element.
 * Removes the class, forces a reflow, then adds it back so the animation re-runs.
 */
export function restartStaggerAnimation(el, staggerClass) {
  if (!el || !staggerClass) return
  el.classList.remove(staggerClass)
  // Force reflow so the browser notices the class removal
  void el.offsetWidth
  el.classList.add(staggerClass)
}

/**
 * Restarts the entrance stagger animations for the main content cards
 * (task input + active header + task list card).
 * Used when switching projects so they feel fresh like on initial load.
 * The stats cards already re-animate naturally because renderStats() replaces their DOM.
 */
export function restartMainContentAnimations() {
  const inputCard = document.getElementById('task-input-card')
  const activeHeader = document.getElementById('active-tasks-header')
  const taskListCard = document.getElementById('task-list-container')

  restartStaggerAnimation(inputCard, 'stagger-4')
  restartStaggerAnimation(activeHeader, 'stagger-5')
  restartStaggerAnimation(taskListCard, 'stagger-6')
}
