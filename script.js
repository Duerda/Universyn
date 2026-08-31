const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const toolNames = {
  pomodoro: 'Pomodoro',
  todo: 'Lista de tarefas',
  notes: 'Notas rápidas',
  calculator: 'Calculadora',
};

const toolSymbols = {
  pomodoro: '◷',
  todo: '✓',
  notes: '✎',
  calculator: '＋',
};

const defaultPositions = {
  todo: { left: 22, top: 58 },
  pomodoro: { left: 306, top: 37 },
  notes: { left: 470, top: 196 },
  calculator: { left: 90, top: 218 },
};

const savedTodos = localStorage.getItem('universyn-todos');
const savedWindowPositions = localStorage.getItem('universyn-window-positions');
const state = {
  todos: savedTodos ? JSON.parse(savedTodos) : [],
  notes: localStorage.getItem('universyn-notes') || '',
  seconds: 1500,
  timer: null,
  openWindows: new Map(),
  positions: savedWindowPositions ? JSON.parse(savedWindowPositions) : {},
  zIndex: 10,
};

function save() {
  localStorage.setItem('universyn-todos', JSON.stringify(state.todos));
  localStorage.setItem('universyn-notes', state.notes);
  localStorage.setItem('universyn-window-positions', JSON.stringify(state.positions));
  updateCount();
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 2500);
}

function updateCount() {
  const count = $('#completed-count');
  if (count) count.textContent = 12 + state.todos.filter((task) => task.done).length;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

function toolMarkup(type) {
  if (type === 'todo') {
    return `<div class="window-kicker">Suas próximas missões, em ordem de lançamento.</div>
      <form id="todo-form">
        <input class="field" id="todo-input" placeholder="Adicionar uma missão..." autocomplete="off">
        <button class="modal-btn" type="submit" aria-label="Adicionar tarefa">＋</button>
      </form>
      <div id="todo-list"></div>`;
  }

  if (type === 'pomodoro') {
    return `<div class="window-kicker">Um ciclo curto para atravessar a atmosfera da distração.</div>
      <div class="timer" id="timer">25:00</div>
      <div class="timer-actions"><button class="modal-btn" id="start-timer">Iniciar foco</button><button class="secondary-btn" id="pause-timer">Pausar</button><button class="secondary-btn" id="reset-timer">Zerar</button></div>`;
  }

  if (type === 'notes') {
    return `<div class="window-kicker">Registre pensamentos enquanto eles ainda estão em órbita.</div>
      <textarea class="field notes" id="notes-input" placeholder="Escreva uma ideia, resumo ou lembrete...">${escapeHtml(state.notes)}</textarea>
      <p class="window-kicker">Salvo automaticamente neste dispositivo.</p>`;
  }

  return `<div class="window-kicker">Faça contas sem sair do seu espaço.</div>
    <input class="field calc-display" id="calc-display" readonly value="">
    <div class="calc-grid">${['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', 'C', '+', '(', ')', '⌫', '='].map((key) => `<button type="button" data-calc="${key}">${key}</button>`).join('')}</div>`;
}

function getPosition(type) {
  const stage = $('#workspace-stage');
  const saved = state.positions[type];
  const base = saved || defaultPositions[type];
  const narrow = stage && stage.clientWidth < 600;
  const narrowTop = { todo: 46, pomodoro: 160, notes: 274, calculator: 388 }[type];
  return {
    left: narrow ? 16 : base.left,
    top: narrow ? narrowTop : base.top,
  };
}

function clampPosition(windowElement, left, top) {
  const stage = $('#workspace-stage');
  const padding = 8;
  const maxLeft = Math.max(padding, stage.clientWidth - windowElement.offsetWidth - padding);
  const maxTop = Math.max(padding, stage.clientHeight - windowElement.offsetHeight - padding);
  return {
    left: Math.min(Math.max(padding, left), maxLeft),
    top: Math.min(Math.max(padding, top), maxTop),
  };
}

function openTool(type) {
  const existing = $(`[data-window="${type}"]`);
  if (existing) {
    existing.classList.remove('is-minimized');
    focusWindow(existing);
    updateDock();
    return;
  }

  const position = getPosition(type);
  const windowElement = document.createElement('article');
  windowElement.className = 'tool-window is-active';
  windowElement.dataset.window = type;
  windowElement.style.left = `${position.left}px`;
  windowElement.style.top = `${position.top}px`;
  windowElement.style.zIndex = ++state.zIndex;
  windowElement.innerHTML = `<div class="window-bar" data-drag-handle>
      <span class="window-symbol">${toolSymbols[type]}</span>
      <strong class="window-title">${toolNames[type]}</strong>
      <div class="window-controls">
        <button class="window-control" data-minimize aria-label="Minimizar ${toolNames[type]}">−</button>
        <button class="window-control close" data-close aria-label="Fechar ${toolNames[type]}">×</button>
      </div>
    </div>
    <div class="window-content">${toolMarkup(type)}</div>`;

  $('#window-layer').appendChild(windowElement);
  state.openWindows.set(type, windowElement);
  bindWindow(windowElement, type);
  focusWindow(windowElement);
  updateDock();
  updateEmptyState();
}

function closeTool(windowElement) {
  const type = windowElement.dataset.window;
  if (type === 'pomodoro') stopTimer();
  state.openWindows.delete(type);
  windowElement.remove();
  updateDock();
  updateEmptyState();
}

function minimizeTool(windowElement) {
  windowElement.classList.add('is-minimized');
  updateDock();
  updateEmptyState();
}

function focusWindow(windowElement) {
  if (!windowElement) return;
  $$('.tool-window').forEach((item) => item.classList.remove('is-active'));
  windowElement.classList.add('is-active');
  windowElement.style.zIndex = ++state.zIndex;
}

function updateEmptyState() {
  const empty = $('#empty-workspace');
  if (empty) empty.hidden = state.openWindows.size > 0;
}

function updateDock() {
  const dock = $('#window-dock');
  if (!dock) return;
  dock.innerHTML = '';
  state.openWindows.forEach((windowElement, type) => {
    if (!windowElement.classList.contains('is-minimized')) return;
    const item = document.createElement('button');
    item.className = 'dock-item';
    item.type = 'button';
    item.innerHTML = `<span>${toolSymbols[type]}</span>${toolNames[type]}`;
    item.addEventListener('click', () => {
      windowElement.classList.remove('is-minimized');
      focusWindow(windowElement);
      updateDock();
    });
    dock.appendChild(item);
  });
}

function bindWindow(windowElement, type) {
  windowElement.addEventListener('pointerdown', () => focusWindow(windowElement));
  $('[data-close]', windowElement).addEventListener('click', (event) => {
    event.stopPropagation();
    closeTool(windowElement);
  });
  $('[data-minimize]', windowElement).addEventListener('click', (event) => {
    event.stopPropagation();
    minimizeTool(windowElement);
  });
  bindDragging(windowElement);

  if (type === 'todo') {
    renderTodos(windowElement);
    $('#todo-form', windowElement).addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('#todo-input', windowElement);
      const text = input.value.trim();
      if (!text) return;
      state.todos.push({ text, done: false });
      input.value = '';
      save();
      renderTodos(windowElement);
      toast('Missão adicionada à órbita');
    });
  }

  if (type === 'notes') {
    $('#notes-input', windowElement).addEventListener('input', (event) => {
      state.notes = event.target.value;
      save();
    });
  }

  if (type === 'pomodoro') {
    updateTimer(windowElement);
    $('#start-timer', windowElement).addEventListener('click', startTimer);
    $('#pause-timer', windowElement).addEventListener('click', stopTimer);
    $('#reset-timer', windowElement).addEventListener('click', resetTimer);
  }

  if (type === 'calculator') bindCalculator(windowElement);
}

function bindDragging(windowElement) {
  const handle = $('[data-drag-handle]', windowElement);
  let drag = null;

  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    const rect = windowElement.getBoundingClientRect();
    drag = { startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top };
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add('is-dragging');
    focusWindow(windowElement);
  });

  handle.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const stageRect = $('#workspace-stage').getBoundingClientRect();
    const next = clampPosition(windowElement, drag.left - stageRect.left + event.clientX - drag.startX, drag.top - stageRect.top + event.clientY - drag.startY);
    windowElement.style.left = `${next.left}px`;
    windowElement.style.top = `${next.top}px`;
  });

  const release = (event) => {
    if (!drag) return;
    const stageRect = $('#workspace-stage').getBoundingClientRect();
    const windowRect = windowElement.getBoundingClientRect();
    const next = clampPosition(windowElement, windowRect.left - stageRect.left, windowRect.top - stageRect.top);
    state.positions[windowElement.dataset.window] = next;
    save();
    drag = null;
    document.body.classList.remove('is-dragging');
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  };

  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', release);
}

function renderTodos(windowElement = $('[data-window="todo"]')) {
  if (!windowElement) return;
  const list = $('#todo-list', windowElement);
  if (!list) return;
  list.innerHTML = state.todos.length
    ? state.todos.map((task, index) => `<div class="todo-row ${task.done ? 'done' : ''}"><input type="checkbox" ${task.done ? 'checked' : ''} data-todo="${index}" aria-label="Concluir ${escapeHtml(task.text)}"><span>${escapeHtml(task.text)}</span><button type="button" data-remove="${index}" aria-label="Remover tarefa">×</button></div>`).join('')
    : '<p class="empty-message">Nenhuma missão por aqui.</p>';

  $$('[data-todo]', windowElement).forEach((checkbox) => checkbox.addEventListener('change', () => {
    state.todos[Number(checkbox.dataset.todo)].done = checkbox.checked;
    save();
    renderTodos(windowElement);
  }));
  $$('[data-remove]', windowElement).forEach((button) => button.addEventListener('click', () => {
    state.todos.splice(Number(button.dataset.remove), 1);
    save();
    renderTodos(windowElement);
  }));
}

function updateTimer(windowElement = $('[data-window="pomodoro"]')) {
  const timer = windowElement && $('#timer', windowElement);
  if (timer) timer.textContent = `${String(Math.floor(state.seconds / 60)).padStart(2, '0')}:${String(state.seconds % 60).padStart(2, '0')}`;
}

function startTimer() {
  if (state.timer) return;
  state.timer = setInterval(() => {
    state.seconds -= 1;
    updateTimer();
    if (state.seconds <= 0) {
      stopTimer();
      state.seconds = 1500;
      updateTimer();
      toast('Sessão concluída. Bom trabalho!');
    }
  }, 1000);
  toast('Foco iniciado por 25 minutos');
}

function stopTimer() {
  clearInterval(state.timer);
  state.timer = null;
}

function resetTimer() {
  stopTimer();
  state.seconds = 1500;
  updateTimer();
}

function bindCalculator(windowElement) {
  const display = $('#calc-display', windowElement);
  $('.calc-grid', windowElement).addEventListener('click', (event) => {
    const key = event.target.dataset.calc;
    if (!key) return;
    if (key === 'C') display.value = '';
    else if (key === '⌫') display.value = display.value.slice(0, -1);
    else if (key === '=') {
      try {
        if (!/^[0-9+*/().\- ]+$/.test(display.value)) throw new Error('invalid');
        display.value = String(Function(`"use strict"; return (${display.value})`)());
      } catch {
        display.value = 'Erro';
      }
    } else display.value += key === '÷' ? '/' : key === '×' ? '*' : key === '−' ? '-' : key;
  });
}

function resetWindows() {
  state.positions = {};
  save();
  state.openWindows.forEach((windowElement, type) => {
    const position = getPosition(type);
    windowElement.style.left = `${position.left}px`;
    windowElement.style.top = `${position.top}px`;
  });
  toast('Órbitas reorganizadas');
}

function bindNavigation() {
  $$('.nav-link[href^="#"]').forEach((link) => link.addEventListener('click', () => $('#sidebar').classList.remove('open')));
  $('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#close-sidebar').addEventListener('click', () => $('#sidebar').classList.remove('open'));
}

function init() {
  const now = new Date();
  $('#current-date').textContent = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  updateCount();
  bindNavigation();

  $$('[data-open-tool]').forEach((button) => button.addEventListener('click', () => openTool(button.dataset.openTool)));
  $('#reset-windows').addEventListener('click', resetWindows);
  const addEvent = $('#add-event'); if (addEvent) addEvent.addEventListener('click', () => toast('Agenda inteligente em breve'));
  $('#reset-data').addEventListener('click', () => {
    if (!confirm('Limpar tarefas e notas salvas?')) return;
    state.todos = [];
    state.notes = '';
    save();
    const todoWindow = $('[data-window="todo"]');
    if (todoWindow) renderTodos(todoWindow);
    const notesWindow = $('[data-window="notes"]');
    if (notesWindow) $('#notes-input', notesWindow).value = '';
    toast('Dados locais limpos');
  });
  const toolSearch = $('#tool-search'); if (toolSearch) toolSearch.addEventListener('input', (event) => {
    const query = event.target.value.toLowerCase();
    $$('[data-tool-card]').forEach((card) => {
      card.style.display = card.dataset.name.includes(query) ? 'flex' : 'none';
    });
  });

  openTool('todo');
  openTool('pomodoro');
  if (window.innerWidth > 760) openTool('notes');
  updateEmptyState();
}

document.addEventListener('DOMContentLoaded', init);
