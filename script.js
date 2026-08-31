const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const toolNames = {
  todo: 'Lista de tarefas',
  pomodoro: 'Pomodoro',
  notes: 'Notas rápidas',
  calculator: 'Calculadora',
  stopwatch: 'Cronômetro',
  flashcards: 'Flashcards',
  converter: 'Conversor',
  randomizer: 'Sorteador',
  browser: 'Mini navegador',
};

const toolSymbols = {
  todo: '✓',
  pomodoro: '◷',
  notes: '✎',
  calculator: '＋',
  stopwatch: '◉',
  flashcards: '▣',
  converter: '⇄',
  randomizer: '✣',
  browser: '⌁',
};

const defaultPositions = {
  todo: { left: 22, top: 58 },
  pomodoro: { left: 306, top: 37 },
  notes: { left: 470, top: 196 },
  calculator: { left: 90, top: 218 },
  stopwatch: { left: 530, top: 42 },
  flashcards: { left: 225, top: 272 },
  converter: { left: 500, top: 214 },
  randomizer: { left: 12, top: 246 },
  browser: { left: 238, top: 112 },
};

const toolOrder = Object.keys(toolNames);
const savedTodos = localStorage.getItem('universyn-todos');
const savedWindowPositions = localStorage.getItem('universyn-window-positions');
const state = {
  todos: savedTodos ? JSON.parse(savedTodos) : [],
  notes: localStorage.getItem('universyn-notes') || '',
  seconds: 1500,
  timer: null,
  stopwatchSeconds: 0,
  stopwatchTimer: null,
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
      <form id="todo-form"><input class="field" id="todo-input" placeholder="Adicionar uma missão..." autocomplete="off"><button class="modal-btn" type="submit" aria-label="Adicionar tarefa">＋</button></form><div id="todo-list"></div>`;
  }

  if (type === 'pomodoro') {
    return `<div class="window-kicker">Um ciclo curto para atravessar a atmosfera da distração.</div><div class="timer" id="timer">25:00</div><div class="timer-actions"><button class="modal-btn" id="start-timer">Iniciar foco</button><button class="secondary-btn" id="pause-timer">Pausar</button><button class="secondary-btn" id="reset-timer">Zerar</button></div>`;
  }

  if (type === 'notes') {
    return `<div class="window-kicker">Registre pensamentos enquanto eles ainda estão em órbita.</div><textarea class="field notes" id="notes-input" placeholder="Escreva uma ideia, resumo ou lembrete...">${escapeHtml(state.notes)}</textarea><p class="window-kicker">Salvo automaticamente neste dispositivo.</p>`;
  }

  if (type === 'calculator') {
    return `<div class="window-kicker">Faça contas sem sair do seu espaço.</div><input class="field calc-display" id="calc-display" readonly value=""><div class="calc-grid">${['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', 'C', '+', '(', ')', '⌫', '='].map((key) => `<button type="button" data-calc="${key}">${key}</button>`).join('')}</div>`;
  }

  if (type === 'stopwatch') {
    return `<div class="window-kicker">Marque o tempo real de uma sessão ou intervalo.</div><div class="timer stopwatch-time" id="stopwatch-time">00:00:00</div><div class="timer-actions"><button class="modal-btn" id="start-stopwatch">Começar</button><button class="secondary-btn" id="pause-stopwatch">Pausar</button><button class="secondary-btn" id="reset-stopwatch">Zerar</button></div>`;
  }

  if (type === 'flashcards') {
    return `<div class="window-kicker flashcard-progress" id="flashcard-progress">Cartão 1 de 5</div><button type="button" class="flashcard" id="flashcard"><span class="flashcard-side flashcard-front" id="flashcard-front"></span><span class="flashcard-side flashcard-back" id="flashcard-back"></span><small>clique para virar</small></button><div class="flashcard-actions"><button class="secondary-btn" id="previous-card">← Anterior</button><button class="modal-btn" id="next-card">Próximo →</button></div>`;
  }

  if (type === 'converter') {
    return `<div class="window-kicker">Converta medidas rapidamente enquanto estuda.</div><select class="field converter-kind" id="converter-kind"><option value="length">Comprimento</option><option value="weight">Peso</option><option value="temperature">Temperatura</option><option value="time">Tempo</option></select><div class="converter-row"><div><label for="converter-value">Valor</label><input class="field" id="converter-value" inputmode="decimal" value="1"></div><div><label for="converter-from">De</label><select class="field" id="converter-from"></select></div><div><label for="converter-to">Para</label><select class="field" id="converter-to"></select></div></div><div class="converter-result" id="converter-result">—</div>`;
  }

  if (type === 'browser') {
    return `<div class="window-kicker">Digite um site e lance uma nova órbita no seu espaço.</div><form class="browser-form" id="browser-form"><input class="field" id="browser-url" type="url" placeholder="https://exemplo.com" inputmode="url" autocomplete="url"><button class="modal-btn" type="submit">Abrir</button></form><div class="browser-frame-wrap" id="browser-frame-wrap"><div class="browser-empty"><span>⌁</span><p>A página aparecerá aqui.</p></div></div><div class="browser-actions"><button type="button" class="secondary-btn" id="browser-reload">Recarregar</button><button type="button" class="secondary-btn" id="browser-new-tab">Nova aba ↗</button></div>`;
  }

  return `<div class="window-kicker">Jogue suas opções no espaço e deixe o acaso decidir.</div><textarea class="field randomizer-input" id="randomizer-input" placeholder="Uma opção por linha...">Estudar 25 minutos\nFazer uma pausa\nRevisar anotações</textarea><button class="modal-btn randomize-btn" id="randomize-btn">Sortear agora ✦</button><div class="randomizer-result" id="randomizer-result">?</div>`;
}

function getPosition(type) {
  const stage = $('#workspace-stage');
  const saved = state.positions[type];
  const base = saved || defaultPositions[type];
  const narrow = stage && stage.clientWidth < 600;
  const index = toolOrder.indexOf(type);
  return { left: narrow ? 16 : base.left, top: narrow ? 28 + (index % 4) * 116 : base.top };
}

function clampPosition(windowElement, left, top) {
  const stage = $('#workspace-stage');
  const padding = 8;
  const maxLeft = Math.max(padding, stage.clientWidth - windowElement.offsetWidth - padding);
  const maxTop = Math.max(padding, stage.clientHeight - windowElement.offsetHeight - padding);
  return { left: Math.min(Math.max(padding, left), maxLeft), top: Math.min(Math.max(padding, top), maxTop) };
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
  windowElement.innerHTML = `<div class="window-bar" data-drag-handle><span class="window-symbol">${toolSymbols[type]}</span><strong class="window-title">${toolNames[type]}</strong><div class="window-controls"><button class="window-control" data-minimize aria-label="Minimizar ${toolNames[type]}">−</button><button class="window-control close" data-close aria-label="Fechar ${toolNames[type]}">×</button></div></div><div class="window-content">${toolMarkup(type)}</div>`;
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
  if (type === 'stopwatch') stopStopwatch();
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
  if (!empty) return;
  const hasWindows = state.openWindows.size > 0;
  empty.hidden = hasWindows;
  empty.style.display = hasWindows ? 'none' : 'flex';
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
  $('[data-close]', windowElement).addEventListener('click', (event) => { event.stopPropagation(); closeTool(windowElement); });
  $('[data-minimize]', windowElement).addEventListener('click', (event) => { event.stopPropagation(); minimizeTool(windowElement); });
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

  if (type === 'notes') $('#notes-input', windowElement).addEventListener('input', (event) => { state.notes = event.target.value; save(); });

  if (type === 'pomodoro') {
    updateTimer(windowElement);
    $('#start-timer', windowElement).addEventListener('click', startTimer);
    $('#pause-timer', windowElement).addEventListener('click', stopTimer);
    $('#reset-timer', windowElement).addEventListener('click', resetTimer);
  }

  if (type === 'calculator') bindCalculator(windowElement);
  if (type === 'stopwatch') bindStopwatch(windowElement);
  if (type === 'flashcards') bindFlashcards(windowElement);
  if (type === 'converter') bindConverter(windowElement);
  if (type === 'randomizer') bindRandomizer(windowElement);
  if (type === 'browser') bindBrowser(windowElement);
}

function bindDragging(windowElement) {
  const handle = $('[data-drag-handle]', windowElement);
  let drag = null;
  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    const rect = windowElement.getBoundingClientRect();
    drag = { startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top };
    try { handle.setPointerCapture(event.pointerId); } catch { /* pointer capture can be unavailable in synthetic tests */ }
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
    try { if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId); } catch { /* no-op */ }
  };
  handle.addEventListener('pointerup', release);
  handle.addEventListener('pointercancel', release);
}

function renderTodos(windowElement = $('[data-window="todo"]')) {
  if (!windowElement) return;
  const list = $('#todo-list', windowElement);
  if (!list) return;
  list.innerHTML = state.todos.length ? `<div class="task-plates">${state.todos.map((task, index) => `<div class="task-plate ${task.done ? 'is-complete' : ''}" data-task-plate><label class="task-check" aria-label="Concluir ${escapeHtml(task.text)}"><input type="checkbox" ${task.done ? 'checked' : ''} data-todo="${index}"><span></span></label><div class="task-info"><strong>${escapeHtml(task.text)}</strong><small>${task.done ? 'Missão concluída' : 'Em órbita'}</small></div><button type="button" class="task-remove" data-remove="${index}" aria-label="Remover tarefa">×</button></div>`).join('')}</div>` : '<p class="empty-message">Nenhuma missão por aqui.</p>';
  $$('[data-todo]', windowElement).forEach((checkbox) => checkbox.addEventListener('change', () => { state.todos[Number(checkbox.dataset.todo)].done = checkbox.checked; save(); renderTodos(windowElement); }));
  $$('[data-remove]', windowElement).forEach((button) => button.addEventListener('click', () => { state.todos.splice(Number(button.dataset.remove), 1); save(); renderTodos(windowElement); }));
}

function updateTimer(windowElement = $('[data-window="pomodoro"]')) {
  const timer = windowElement && $('#timer', windowElement);
  if (timer) timer.textContent = `${String(Math.floor(state.seconds / 60)).padStart(2, '0')}:${String(state.seconds % 60).padStart(2, '0')}`;
}
function startTimer() {
  if (state.timer) return;
  state.timer = setInterval(() => { state.seconds -= 1; updateTimer(); if (state.seconds <= 0) { stopTimer(); state.seconds = 1500; updateTimer(); toast('Sessão concluída. Bom trabalho!'); } }, 1000);
  toast('Foco iniciado por 25 minutos');
}
function stopTimer() { clearInterval(state.timer); state.timer = null; }
function resetTimer() { stopTimer(); state.seconds = 1500; updateTimer(); }

function formatStopwatch(seconds) { return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function updateStopwatch() { const timer = $('#stopwatch-time'); if (timer) timer.textContent = formatStopwatch(state.stopwatchSeconds); }
function startStopwatch() { if (state.stopwatchTimer) return; state.stopwatchTimer = setInterval(() => { state.stopwatchSeconds += 1; updateStopwatch(); }, 1000); }
function stopStopwatch() { clearInterval(state.stopwatchTimer); state.stopwatchTimer = null; }
function resetStopwatch() { stopStopwatch(); state.stopwatchSeconds = 0; updateStopwatch(); }
function bindStopwatch(windowElement) { updateStopwatch(); $('#start-stopwatch', windowElement).addEventListener('click', startStopwatch); $('#pause-stopwatch', windowElement).addEventListener('click', stopStopwatch); $('#reset-stopwatch', windowElement).addEventListener('click', resetStopwatch); }

function bindCalculator(windowElement) {
  const display = $('#calc-display', windowElement);
  $('.calc-grid', windowElement).addEventListener('click', (event) => {
    const key = event.target.dataset.calc;
    if (!key) return;
    if (key === 'C') display.value = '';
    else if (key === '⌫') display.value = display.value.slice(0, -1);
    else if (key === '=') {
      try { if (!/^[0-9+*/().\- ]+$/.test(display.value)) throw new Error('invalid'); display.value = String(Function(`"use strict"; return (${display.value})`)()); } catch { display.value = 'Erro'; }
    } else display.value += key === '÷' ? '/' : key === '×' ? '*' : key === '−' ? '-' : key;
  });
}

const flashcards = [
  ['O que é a técnica Pomodoro?', 'Ciclos de foco, normalmente 25 minutos, intercalados com pequenas pausas.'],
  ['Qual a função de uma lista de tarefas?', 'Tirar as pendências da cabeça e transformar intenção em próxima ação.'],
  ['O que é revisão ativa?', 'Tentar lembrar o conteúdo antes de consultar a resposta ou o material.'],
  ['Por que fazer pausas?', 'Pausas ajudam a recuperar atenção e consolidar o que foi estudado.'],
  ['Qual é o melhor ritmo de estudo?', 'Aquele que você consegue repetir com consistência e sem se esgotar.'],
];
function bindFlashcards(windowElement) {
  let current = 0;
  const card = $('#flashcard', windowElement);
  const front = $('#flashcard-front', windowElement);
  const back = $('#flashcard-back', windowElement);
  const progress = $('#flashcard-progress', windowElement);
  const render = () => { front.textContent = flashcards[current][0]; back.textContent = flashcards[current][1]; progress.textContent = `Cartão ${current + 1} de ${flashcards.length}`; card.classList.remove('is-flipped'); };
  card.addEventListener('click', () => card.classList.toggle('is-flipped'));
  $('#next-card', windowElement).addEventListener('click', () => { current = (current + 1) % flashcards.length; render(); });
  $('#previous-card', windowElement).addEventListener('click', () => { current = (current - 1 + flashcards.length) % flashcards.length; render(); });
  render();
}

const converterUnits = {
  length: { labels: { meter: 'Metros', kilometer: 'Quilômetros', centimeter: 'Centímetros', inch: 'Polegadas' }, values: { meter: 1, kilometer: 1000, centimeter: .01, inch: .0254 } },
  weight: { labels: { kilogram: 'Quilos', gram: 'Gramas', pound: 'Libras' }, values: { kilogram: 1, gram: .001, pound: .453592 } },
  temperature: { labels: { celsius: 'Celsius', fahrenheit: 'Fahrenheit', kelvin: 'Kelvin' }, values: { celsius: 1, fahrenheit: 1, kelvin: 1 } },
  time: { labels: { second: 'Segundos', minute: 'Minutos', hour: 'Horas', day: 'Dias' }, values: { second: 1, minute: 60, hour: 3600, day: 86400 } },
};
function converterValue(value, kind, from, to) {
  if (kind === 'temperature') { const celsius = from === 'celsius' ? value : from === 'fahrenheit' ? (value - 32) * 5 / 9 : value - 273.15; return to === 'celsius' ? celsius : to === 'fahrenheit' ? celsius * 9 / 5 + 32 : celsius + 273.15; }
  return value * converterUnits[kind].values[from] / converterUnits[kind].values[to];
}
function bindConverter(windowElement) {
  const kind = $('#converter-kind', windowElement); const from = $('#converter-from', windowElement); const to = $('#converter-to', windowElement); const value = $('#converter-value', windowElement); const result = $('#converter-result', windowElement);
  const renderUnits = () => { const units = converterUnits[kind.value]; const options = Object.entries(units.labels).map(([key, label]) => `<option value="${key}">${label}</option>`).join(''); from.innerHTML = options; to.innerHTML = options; to.selectedIndex = Math.min(1, to.options.length - 1); calculate(); };
  const calculate = () => { const number = Number(String(value.value).replace(',', '.')); if (!Number.isFinite(number)) { result.textContent = 'Digite um valor válido'; return; } const converted = converterValue(number, kind.value, from.value, to.value); result.textContent = `${converted.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} ${converterUnits[kind.value].labels[to.value]}`; };
  kind.addEventListener('change', renderUnits); from.addEventListener('change', calculate); to.addEventListener('change', calculate); value.addEventListener('input', calculate); renderUnits();
}

function bindRandomizer(windowElement) {
  const input = $('#randomizer-input', windowElement); const button = $('#randomize-btn', windowElement); const result = $('#randomizer-result', windowElement);
  button.addEventListener('click', () => { const options = input.value.split('\n').map((item) => item.trim()).filter(Boolean); if (!options.length) { result.textContent = 'Adicione opções'; return; } result.classList.remove('is-revealing'); void result.offsetWidth; result.classList.add('is-revealing'); result.textContent = options[Math.floor(Math.random() * options.length)]; });
}

function bindBrowser(windowElement) {
  const form = $('#browser-form', windowElement);
  const input = $('#browser-url', windowElement);
  const frameWrap = $('#browser-frame-wrap', windowElement);
  const reload = $('#browser-reload', windowElement);
  const newTab = $('#browser-new-tab', windowElement);
  let currentUrl = '';
  const renderFrame = (url) => {
    currentUrl = url;
    frameWrap.innerHTML = `<iframe class="browser-frame" title="Site flutuante" src="${escapeHtml(url)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><small class="browser-note">Se o site bloquear a incorporação, use “Nova aba ↗”.</small>`;
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let raw = input.value.trim();
    if (!raw) return;
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
      input.value = url.href;
      renderFrame(url.href);
    } catch {
      toast('Digite um endereço válido');
    }
  });
  reload.addEventListener('click', () => { if (currentUrl) renderFrame(currentUrl); });
  newTab.addEventListener('click', () => { if (currentUrl) window.open(currentUrl, '_blank', 'noopener,noreferrer'); else toast('Abra um site primeiro'); });
}

function resetWindows() {
  state.positions = {};
  save();
  state.openWindows.forEach((windowElement, type) => { const position = getPosition(type); windowElement.style.left = `${position.left}px`; windowElement.style.top = `${position.top}px`; });
  toast('Órbitas reorganizadas');
}

function bindNavigation() {
  $$('.landing-links a, .nav-link[href^="#"]').forEach((link) => link.addEventListener('click', () => { const sidebar = $('#sidebar'); if (sidebar) sidebar.classList.remove('open'); }));
  const menu = $('#mobile-menu'); if (menu) menu.addEventListener('click', () => { const nav = $('.landing-links'); if (nav) nav.classList.toggle('is-open'); });
}

function init() {
  updateCount();
  bindNavigation();
  const stage = $('#workspace-stage');
  if (!stage) return;
  $$('[data-open-tool]').forEach((button) => button.addEventListener('click', () => openTool(button.dataset.openTool)));
  const resetWindowsButton = $('#reset-windows'); if (resetWindowsButton) resetWindowsButton.addEventListener('click', resetWindows);
  const resetData = $('#reset-data');
  if (resetData) resetData.addEventListener('click', () => { if (!confirm('Limpar tarefas e notas salvas?')) return; state.todos = []; state.notes = ''; save(); const todoWindow = $('[data-window="todo"]'); if (todoWindow) renderTodos(todoWindow); const notesWindow = $('[data-window="notes"]'); if (notesWindow) $('#notes-input', notesWindow).value = ''; toast('Dados locais limpos'); });
  openTool('todo');
  openTool('pomodoro');
  if (window.innerWidth > 760) openTool('notes');
  updateEmptyState();
}

document.addEventListener('DOMContentLoaded', init);
