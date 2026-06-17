/**
 * Date Picker Module
 * Fully extracted from the legacy bridge.
 */

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let onDateSelected = null; // callback

export function openDatePicker(currentDueDate = null, callback) {
  onDateSelected = callback;

  const modal = document.getElementById('date-picker-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Initialize to current selected date or today
  if (currentDueDate) {
    const d = new Date(currentDueDate);
    calendarYear = d.getFullYear();
    calendarMonth = d.getMonth();
  } else {
    const today = new Date();
    calendarYear = today.getFullYear();
    calendarMonth = today.getMonth();
  }

  renderCalendar(currentDueDate);

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeDatePicker();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler, { once: true });
}

export function closeDatePicker() {
  const modal = document.getElementById('date-picker-modal');
  if (modal) {
    modal.classList.remove('flex');
    modal.classList.add('hidden');
  }
}

function renderCalendar(selectedDueDate = null) {
  const grid = document.getElementById('calendar-grid');
  const header = document.getElementById('calendar-month-year');
  if (!grid || !header) return;

  grid.innerHTML = '';

  const date = new Date(calendarYear, calendarMonth, 1);
  const monthName = date.toLocaleString('default', { month: 'long' });
  header.textContent = `${monthName} ${calendarYear}`;

  const firstDay = date.getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];
  const selectedStr = selectedDueDate || '';

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'h-9';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const dayEl = document.createElement('div');
    dayEl.className = `h-9 flex items-center justify-center rounded-xl cursor-pointer text-sm transition-all hover:bg-slate-800`;

    if (dayStr === todayStr) {
      dayEl.classList.add('border', 'border-primary', 'text-primary');
    }

    if (dayStr === selectedStr) {
      dayEl.classList.add('bg-primary', 'text-on-primary', 'font-semibold');
    }

    dayEl.textContent = day;
    dayEl.onclick = () => selectDate(dayStr);

    grid.appendChild(dayEl);
  }
}

function selectDate(dateStr) {
  if (onDateSelected) {
    onDateSelected(dateStr);
  }
  closeDatePicker();
}

export function prevMonth() {
  calendarMonth--;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }
  renderCalendar();
}

export function nextMonth() {
  calendarMonth++;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  renderCalendar();
}

export function selectToday() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  selectDate(dateStr);
}

export function clearSelectedDate() {
  if (onDateSelected) {
    onDateSelected(null);
  }
  closeDatePicker();
}

export function goToToday() {
  const today = new Date();
  calendarYear = today.getFullYear();
  calendarMonth = today.getMonth();
  renderCalendar();
}

// Wire header buttons (called once)
export function initDatePicker() {
  const modal = document.getElementById('date-picker-modal');
  if (!modal) return;

  // Close when clicking backdrop
  modal.onclick = (e) => {
    if (e.target.id === 'date-picker-modal') {
      closeDatePicker();
    }
  };

  // Wire using data attributes (preferred) or fallback
  const prevBtn = modal.querySelector('[data-action="prev-month"]');
  if (prevBtn) prevBtn.onclick = prevMonth;

  const nextBtn = modal.querySelector('[data-action="next-month"]');
  if (nextBtn) nextBtn.onclick = nextMonth;

  const todayBtn = modal.querySelector('[data-action="select-today"]');
  if (todayBtn) todayBtn.onclick = selectToday;

  const clearBtn = modal.querySelector('[data-action="clear-date"]');
  if (clearBtn) clearBtn.onclick = clearSelectedDate;

  const goTodayBtn = modal.querySelector('[data-action="go-today"]') || modal.querySelector('#calendar-month-year');
  if (goTodayBtn) goTodayBtn.onclick = goToToday;

  // Close button (× in header)
  const closeBtn = modal.querySelector('.close-date-picker');
  if (closeBtn) closeBtn.onclick = closeDatePicker;
}
