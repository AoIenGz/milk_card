// === VANTA.NET 背景 ===
let vantaEffect = null;
function initVanta() {
  try {
    if (typeof VANTA === 'undefined') return;
    vantaEffect = VANTA.NET({
      el: '#vanta-bg',
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1,
      scaleMobile: 1,
      color: 0xff3f81,
      backgroundColor: 0x23153c,
      points: 10,
      maxDistance: 20,
      spacing: 15
    });
  } catch (e) {
    console.error('VANTA init failed:', e);
  }
}

// === 配置 ===
const API_BASE = '/api';
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DAY_LABELS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

let authToken = localStorage.getItem('milk_token') || null;
let currentUser = localStorage.getItem('milk_user') || null;

// === API 层 ===
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (res.status === 401) { logout(); throw new Error('未登录'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function getWeekId() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - jan1) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getTodayIndex() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

async function loadWeekTodos() {
  return await api(`/todos?week=${getWeekId()}`);
}

async function saveDayTodos(dayKey, todos) {
  return await api(`/todos/${dayKey}`, {
    method: 'POST',
    body: JSON.stringify({ weekId: getWeekId(), todos }),
  });
}

async function loadStats() {
  return await api('/stats');
}

// === 登录/注册 ===
function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('milk_token');
  localStorage.removeItem('milk_user');
  showLogin();
}

async function handleLogin(username, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  authToken = data.token;
  currentUser = data.username;
  localStorage.setItem('milk_token', authToken);
  localStorage.setItem('milk_user', currentUser);
}

async function handleRegister(username, password) {
  const data = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  authToken = data.token;
  currentUser = data.username;
  localStorage.setItem('milk_token', authToken);
  localStorage.setItem('milk_user', currentUser);
}

// === 登录页动画 ===
function getVisibleForm() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  if (registerForm.style.display !== 'none' && registerForm.offsetParent !== null) return registerForm;
  return loginForm;
}

function animateLoginEntrance() {
  try {
    const card = document.querySelector('.login-card');
    const title = document.querySelector('.login-title');
    const subtitle = document.querySelector('.login-subtitle');
    const visibleForm = getVisibleForm();
    const staggers = visibleForm.querySelectorAll('.login-stagger');

    // 用 gsap.from：从指定状态动画到当前 CSS 状态（可见）
    // 即使动画失败，元素也会是可见的
    gsap.from(card, { opacity: 0, y: 30, scale: 0.95, duration: 0.5, ease: 'power2.out', delay: 0.1 });
    gsap.from(title, { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out', delay: 0.3 });
    gsap.from(subtitle, { opacity: 0, y: 8, duration: 0.3, ease: 'power2.out', delay: 0.38 });
    gsap.from(staggers, { opacity: 0, y: 14, duration: 0.3, stagger: 0.07, ease: 'power2.out', delay: 0.45 });
  } catch (e) {
    console.error('Login entrance animation failed:', e);
  }
}

function animateLoginExit(onComplete) {
  try {
    const card = document.querySelector('.login-card');
    gsap.to(card, {
      scale: 0.85, opacity: 0, y: -20, duration: 0.4, ease: 'power3.in',
      onComplete
    });
  } catch (e) {
    console.error('Login exit animation failed:', e);
    onComplete();
  }
}

function animateFormSwitch(showForm, hideForm) {
  try {
    const hideStaggers = hideForm.querySelectorAll('.login-stagger');
    const showStaggers = showForm.querySelectorAll('.login-stagger');

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.to(hideStaggers, { opacity: 0, y: -10, duration: 0.2, stagger: 0.03 });
    tl.call(() => {
      hideForm.style.display = 'none';
      showForm.style.display = 'flex';
    });
    tl.from(showStaggers, { opacity: 0, y: 14, duration: 0.25, stagger: 0.06 }, '+=0.05');
  } catch (e) {
    console.error('Form switch animation failed:', e);
    hideForm.style.display = 'none';
    showForm.style.display = 'flex';
  }
}

// 按钮涟漪效果
function addRipple(btn, e) {
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(rect.width, rect.height) * 2;
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function showLogin() {
  document.getElementById('login-scene').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('user-panel').style.display = 'none';
  animateLoginEntrance();
}

function hideLogin() {
  animateLoginExit(() => {
    document.getElementById('login-scene').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('username-display').textContent = currentUser;
    document.getElementById('user-panel').style.display = 'flex';
  });
}

// === 状态机 ===
const States = { CAROUSEL: 'CAROUSEL', PAGE_OPEN: 'PAGE_OPEN', TRANSITIONING: 'TRANSITIONING' };
const transitionsMap = {
  [States.CAROUSEL]:      { OPEN: States.PAGE_OPEN },
  [States.PAGE_OPEN]:     { CLOSE: States.CAROUSEL },
  [States.TRANSITIONING]: {}
};
let currentState = States.CAROUSEL;
function getState() { return currentState; }
function isTransitioning() { return currentState === States.TRANSITIONING; }
function tryTransition(action) {
  const allowed = transitionsMap[currentState];
  if (allowed && allowed[action]) { const t = allowed[action]; currentState = States.TRANSITIONING; return t; }
  return null;
}
function completeTransition(s) { currentState = s; }

// === 轮播 ===
let activeIndex = 0;
let cards = [];
let onCardConfirm = null;
let weekData = null;

function getCardProps(dist) {
  if (dist === 0) return { x: -30, y: -40, scale: 1.08, opacity: 1, rotation: 0, zIndex: 100 };
  return { x: 25 + dist * 22, y: dist * 14, scale: Math.max(0.72, 0.96 - dist * 0.04), opacity: Math.max(0.2, 0.75 - dist * 0.09), rotation: dist * 1.5, zIndex: 100 - dist };
}

function positionCards(animated) {
  cards.forEach((card, i) => {
    const dist = (i - activeIndex + 7) % 7;
    const props = getCardProps(dist);
    card.style.zIndex = props.zIndex;
    const t = { x: props.x, y: props.y, scale: props.scale, rotation: props.rotation, opacity: props.opacity };
    if (animated) gsap.to(card, { ...t, duration: 0.5, ease: 'power2.out' });
    else gsap.set(card, t);
  });
}

function renderCardContent(card, dayKey, index) {
  const todos = weekData?.days?.[dayKey] || [];
  const doneCount = todos.filter(t => t.done).length;
  const rate = todos.length > 0 ? (doneCount / todos.length * 100) : 0;
  card.classList.toggle('is-today', index === getTodayIndex());
  card.innerHTML = `
    <div class="edge-light"></div>
    <div class="card-content">
      <span class="card-day">${DAY_LABELS_SHORT[index]}</span>
      <span class="card-date">${DAY_LABELS[index]}</span>
      <div class="card-progress-bar"><div class="card-progress-fill" style="width:${rate}%"></div></div>
      <span class="card-count">${doneCount}/${todos.length} 完成</span>
      <div class="card-preview-items">
        ${todos.slice(0, 3).map(t => `<span class="card-preview-item ${t.done ? 'is-done' : ''}">${t.text}</span>`).join('')}
      </div>
    </div>`;
}

function handleCardClick(index) {
  if (index === activeIndex) { if (onCardConfirm) onCardConfirm(); }
  else switchTo(index);
}

function switchTo(index) {
  if (index === activeIndex) return;
  activeIndex = index;
  updateActiveCard();
  updateIndicator();
  positionCards(true);
}

function switchNext() { switchTo((activeIndex + 1) % 7); }
function switchPrev() { switchTo((activeIndex - 1 + 7) % 7); }

function updateActiveCard() { cards.forEach((c, i) => c.classList.toggle('is-active', i === activeIndex)); }

function renderIndicator() {
  const indicator = document.getElementById('carousel-indicator');
  indicator.innerHTML = DAY_LABELS_SHORT.map((_, i) =>
    `<span class="indicator-dot ${i === activeIndex ? 'is-active' : ''}" data-index="${i}"></span>`
  ).join('');
  indicator.querySelectorAll('.indicator-dot').forEach(dot => {
    dot.addEventListener('click', () => switchTo(parseInt(dot.dataset.index)));
  });
}

function updateIndicator() {
  document.querySelectorAll('.indicator-dot').forEach((dot, i) => dot.classList.toggle('is-active', i === activeIndex));
}

function getActiveCard() { return cards[activeIndex]; }
function getOtherCards() { return cards.filter((_, i) => i !== activeIndex); }
function getActiveDayKey() { return DAY_KEYS[activeIndex]; }

function resetCardPositions() { positionCards(false); }

async function refreshCards() {
  weekData = await loadWeekTodos();
  cards.forEach((card, i) => renderCardContent(card, DAY_KEYS[i], i));
  await updateStatsFromServer();
}

async function updateStatsFromServer() {
  try {
    const stats = await loadStats();
    const CIRC = 2 * Math.PI * 20;
    const todayRate = stats.today.total > 0 ? stats.today.done / stats.today.total : 0;
    const todayFill = document.querySelector('#stat-today .stat-ring-fill');
    const todayNum = document.querySelector('#stat-today .stat-ring-number');
    if (todayFill) todayFill.style.strokeDashoffset = CIRC * (1 - todayRate);
    if (todayNum) todayNum.textContent = `${stats.today.done}/${stats.today.total}`;

    const weekFill = document.querySelector('#stat-week .stat-ring-fill');
    const weekNum = document.querySelector('#stat-week .stat-ring-number');
    if (weekFill) weekFill.style.strokeDashoffset = CIRC * (1 - stats.weekDays / 7);
    if (weekNum) weekNum.textContent = `${stats.weekDays}`;

    const lwFill = document.querySelector('#stat-last-week .stat-ring-fill');
    const lwNum = document.querySelector('#stat-last-week .stat-ring-number');
    if (lwFill) lwFill.style.strokeDashoffset = CIRC * (1 - stats.lastWeekDays / 7);
    if (lwNum) lwNum.textContent = `${stats.lastWeekDays}`;
  } catch (e) { console.error('stats error', e); }
}

async function initCarousel(confirmHandler) {
  onCardConfirm = confirmHandler;
  weekData = await loadWeekTodos();
  const carousel = document.getElementById('carousel');
  carousel.innerHTML = '';
  cards = [];
  DAY_KEYS.forEach((key, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.day = key;
    card.dataset.index = i;
    renderCardContent(card, key, i);
    card.addEventListener('click', () => handleCardClick(i));
    carousel.appendChild(card);
    cards.push(card);
  });
  activeIndex = getTodayIndex();
  updateActiveCard();
  positionCards(false);
  renderIndicator();
  initCardGlow();
  await updateStatsFromServer();
}

// === 卡片炫光追踪 ===
function initCardGlow() {
  const scene = document.getElementById('carousel-scene');
  scene.addEventListener('mousemove', (e) => {
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
      const proximity = Math.max(0, Math.min(100, (1 - dist / (maxDist * 2.5)) * 100));
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;
      card.style.setProperty('--edge-proximity', proximity.toFixed(1));
      card.style.setProperty('--cursor-angle', angle.toFixed(1) + 'deg');
    });
  });
  scene.addEventListener('mouseleave', () => {
    cards.forEach(card => {
      card.style.setProperty('--edge-proximity', '0');
    });
  });
}

// === 待办页面 ===
let currentDayKey = null;
let saveTimeout = null;

function createTodoItem(todo) {
  const li = document.createElement('li');
  li.className = `todo-item ${todo.done ? 'is-done' : ''}`;
  li.dataset.id = todo.id;
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox'; checkbox.className = 'todo-checkbox'; checkbox.checked = todo.done;
  checkbox.addEventListener('change', () => toggleTodo(todo.id, checkbox.checked));
  const text = document.createElement('span');
  text.className = 'todo-text'; text.contentEditable = true; text.textContent = todo.text;
  text.addEventListener('input', () => { todo.text = text.textContent; debouncedSave(); });
  text.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); text.blur(); } });
  const del = document.createElement('button');
  del.className = 'todo-delete'; del.innerHTML = '&times;';
  del.addEventListener('click', () => deleteTodo(todo.id));
  li.append(checkbox, text, del);
  return li;
}

function toggleTodo(id, done) {
  const todos = weekData.days[currentDayKey] || [];
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.done = done;
    debouncedSave();
    const li = document.querySelector(`.todo-item[data-id="${id}"]`);
    if (li) li.classList.toggle('is-done', done);
    updatePageProgress();
  }
}

function deleteTodo(id) {
  weekData.days[currentDayKey] = (weekData.days[currentDayKey] || []).filter(t => t.id !== id);
  const li = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (li) {
    gsap.to(li, { opacity: 0, height: 0, padding: 0, marginBottom: 0, duration: 0.25, ease: 'power2.in', onComplete: () => { li.remove(); updatePageProgress(); } });
  }
  debouncedSave();
}

function addTodo() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const todo = { id, text: '', done: false };
  if (!weekData.days[currentDayKey]) weekData.days[currentDayKey] = [];
  weekData.days[currentDayKey].push(todo);
  const list = document.getElementById('todo-list');
  const li = createTodoItem(todo);
  gsap.fromTo(li, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
  list.appendChild(li);
  li.querySelector('.todo-text').focus();
  updatePageProgress();
  debouncedSave();
}

function updatePageProgress() {
  const todos = weekData.days[currentDayKey] || [];
  const done = todos.filter(t => t.done).length;
  const el = document.getElementById('page-progress');
  if (el) el.textContent = `${done}/${todos.length} 完成`;
}

function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    if (currentDayKey && weekData) {
      try { await saveDayTodos(currentDayKey, weekData.days[currentDayKey] || []); } catch (e) { console.error('save error', e); }
    }
  }, 500);
}

function renderPage(dayKey) {
  currentDayKey = dayKey;
  const todos = weekData.days[dayKey] || [];
  document.getElementById('page-title').textContent = DAY_LABELS[DAY_KEYS.indexOf(dayKey)];
  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  todos.forEach(todo => list.appendChild(createTodoItem(todo)));
  updatePageProgress();
  renderPomoTaskList();
}

// === 番茄钟 ===
const POMO = {
  FOCUS: 25 * 60,
  SHORT_BREAK: 5 * 60,
  LONG_BREAK: 15 * 60,
  ROUNDS: 4,
};

let pomoState = 'idle'; // idle | running | paused
let pomoMode = 'focus'; // focus | short | long
let pomoRound = 1;
let pomoTimeLeft = POMO.FOCUS;
let pomoTimer = null;
let pomoSelectedTask = null;

const POMO_CIRC = 2 * Math.PI * 90; // r=90

function pomoTotalForMode(mode) {
  if (mode === 'focus') return POMO.FOCUS;
  if (mode === 'short') return POMO.SHORT_BREAK;
  return POMO.LONG_BREAK;
}

function pomoModeLabel(mode) {
  if (mode === 'focus') return '专注';
  if (mode === 'short') return '短休息';
  return '长休息';
}

function pomoModeLabelDone(mode) {
  if (mode === 'focus') return '专注完成';
  if (mode === 'short') return '休息结束';
  return '长休息结束';
}

function updatePomoDisplay() {
  const min = Math.floor(pomoTimeLeft / 60);
  const sec = pomoTimeLeft % 60;
  document.getElementById('pomo-minutes').textContent = String(min).padStart(2, '0');
  document.getElementById('pomo-seconds').textContent = String(sec).padStart(2, '0');
  document.getElementById('pomo-mode-label').textContent = pomoModeLabel(pomoMode);
  document.getElementById('pomo-round').textContent = `${pomoRound} / ${POMO.ROUNDS}`;

  // 环形进度
  const total = pomoTotalForMode(pomoMode);
  const progress = total > 0 ? pomoTimeLeft / total : 1;
  const offset = POMO_CIRC * (1 - progress);
  const fill = document.querySelector('.pomo-ring-fill');
  if (fill) fill.style.strokeDashoffset = offset;

  // 休息模式换色
  const wrap = document.getElementById('pomo-timer-wrap');
  if (wrap) {
    wrap.classList.toggle('is-break', pomoMode !== 'focus');
  }

  // 开始/暂停按钮切换
  document.getElementById('pomo-start').style.display = pomoState === 'running' ? 'none' : 'flex';
  document.getElementById('pomo-pause').style.display = pomoState === 'running' ? 'flex' : 'none';

  // 高亮关联的待办项
  document.querySelectorAll('.todo-item').forEach(li => {
    li.classList.toggle('is-pomo-active', pomoSelectedTask && li.dataset.id === pomoSelectedTask);
  });
}

function pomoTick() {
  if (pomoTimeLeft <= 0) {
    clearInterval(pomoTimer);
    pomoTimer = null;
    pomoOnComplete();
    return;
  }
  pomoTimeLeft--;
  updatePomoDisplay();
}

function pomoStart() {
  if (pomoState === 'running') return;
  pomoState = 'running';
  pomoTimer = setInterval(pomoTick, 1000);
  updatePomoDisplay();
}

function pomoPause() {
  if (pomoState !== 'running') return;
  pomoState = 'paused';
  clearInterval(pomoTimer);
  pomoTimer = null;
  updatePomoDisplay();
}

function pomoReset() {
  clearInterval(pomoTimer);
  pomoTimer = null;
  pomoState = 'idle';
  pomoMode = 'focus';
  pomoRound = 1;
  pomoTimeLeft = POMO.FOCUS;
  pomoSelectedTask = null;
  updatePomoDisplay();
  renderPomoTaskList();
}

function pomoOnComplete() {
  // 播放提示音
  pomoPlaySound();

  // 显示完成浮层
  const overlay = document.getElementById('pomo-complete-overlay');
  const text = document.getElementById('pomo-complete-text');
  text.textContent = pomoModeLabelDone(pomoMode);
  overlay.style.display = 'flex';

  // 视觉闪烁
  const panel = document.getElementById('pomodoro-panel');
  panel.classList.add('pomo-flash');
  setTimeout(() => panel.classList.remove('pomo-flash'), 1500);
}

function pomoNextPhase() {
  // 关闭完成浮层
  document.getElementById('pomo-complete-overlay').style.display = 'none';

  if (pomoMode === 'focus') {
    if (pomoRound >= POMO.ROUNDS) {
      pomoMode = 'long';
      pomoTimeLeft = POMO.LONG_BREAK;
    } else {
      pomoMode = 'short';
      pomoTimeLeft = POMO.SHORT_BREAK;
    }
  } else {
    // 休息结束，进入下一轮专注
    if (pomoMode === 'long') {
      pomoRound = 1;
    } else {
      pomoRound++;
    }
    pomoMode = 'focus';
    pomoTimeLeft = POMO.FOCUS;
  }

  pomoState = 'idle';
  updatePomoDisplay();
  // 自动开始下一阶段
  pomoStart();
}

function pomoPlaySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    playTone(880, 0, 0.15);
    playTone(880, 0.2, 0.15);
    playTone(1100, 0.45, 0.25);
  } catch (e) { /* 静默失败 */ }
}

function renderPomoTaskList() {
  const list = document.getElementById('pomo-task-list');
  if (!list) return;
  const todos = (currentDayKey && weekData) ? (weekData.days[currentDayKey] || []) : [];
  const undone = todos.filter(t => !t.done);
  list.innerHTML = '';
  if (undone.length === 0) {
    list.innerHTML = '<li class="pomo-task-item" style="opacity:0.4;cursor:default">暂无未完成的任务</li>';
    return;
  }
  undone.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'pomo-task-item';
    if (pomoSelectedTask === todo.id) li.classList.add('is-selected');
    li.innerHTML = `<span class="pomo-task-dot"></span><span class="pomo-task-name">${todo.text || '未命名任务'}</span>`;
    li.addEventListener('click', () => {
      pomoSelectedTask = pomoSelectedTask === todo.id ? null : todo.id;
      renderPomoTaskList();
      updatePomoDisplay();
    });
    list.appendChild(li);
  });
}

function initPomoEvents() {
  document.getElementById('pomo-start').addEventListener('click', pomoStart);
  document.getElementById('pomo-pause').addEventListener('click', pomoPause);
  document.getElementById('pomo-reset').addEventListener('click', pomoReset);
  document.getElementById('pomo-complete-btn').addEventListener('click', pomoNextPhase);
}

// === 转场动画 ===
function animateCarouselToPage(onComplete) {
  const card = getActiveCard();
  const others = getOtherCards();
  const page = document.getElementById('page-scene');
  const stats = document.getElementById('stats-panel');
  const controls = document.querySelectorAll('#btn-prev, #btn-next, #carousel-indicator');

  renderPage(getActiveDayKey());
  gsap.set(page, { visibility: 'visible', opacity: 0 });
  page.classList.remove('hidden');

  const tl = gsap.timeline({ onComplete: () => { gsap.set(card, { clearProps: 'all' }); gsap.set(others, { clearProps: 'all' }); onComplete(); } });
  tl.to(stats, { opacity: 0, y: -10, duration: 0.2, ease: 'power2.in' }, 0);
  tl.to(controls, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
  tl.to(card, { y: -80, scale: 1.4, opacity: 1, boxShadow: '0 30px 60px rgba(233,69,96,0.5)', duration: 0.3, ease: 'power2.out' }, 0);
  tl.to(card, { width: '100vw', height: '100vh', x: 0, y: 0, scale: 1, rotation: 0, borderRadius: '0px', opacity: 0, duration: 0.4, ease: 'power3.inOut' }, 0.2);
  tl.to(others, { opacity: 0, scale: 0.5, duration: 0.3, ease: 'power2.in', stagger: 0.02 }, 0.05);
  tl.to(page, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.3);
  const items = page.querySelectorAll('.todo-item');
  tl.fromTo(items, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' }, 0.45);
}

function animatePageToCarousel(onComplete) {
  const page = document.getElementById('page-scene');
  const carousel = document.getElementById('carousel');
  const stats = document.getElementById('stats-panel');
  const controls = document.querySelectorAll('#btn-prev, #btn-next, #carousel-indicator');

  const tl = gsap.timeline({
    onComplete: () => {
      page.classList.add('hidden');
      gsap.set(page, { clearProps: 'all' });
      gsap.set(page, { visibility: 'hidden' });
      resetCardPositions();
      refreshCards();
      onComplete();
    }
  });

  tl.to(stats, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.3);
  tl.to(controls, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.3);
  tl.to(page, { scale: 0.5, rotation: -3, borderRadius: '16px', filter: 'blur(4px)', y: 30, duration: 0.4, ease: 'power3.in' }, 0);
  tl.to(page, { scale: 0.35, opacity: 0, x: 20, duration: 0.3, ease: 'power2.in' }, 0.3);
  tl.fromTo(carousel, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 0.3);
}

// === 主流程 ===
function openPage() {
  const t = tryTransition('OPEN'); if (!t) return;
  animateCarouselToPage(() => completeTransition(t));
}

function closePage() {
  const t = tryTransition('CLOSE'); if (!t) return;
  // 清理番茄钟
  clearInterval(pomoTimer);
  pomoTimer = null;
  pomoState = 'idle';
  document.getElementById('pomo-complete-overlay').style.display = 'none';
  animatePageToCarousel(() => completeTransition(t));
}

function handleCardConfirm() {
  if (isTransitioning()) return;
  if (getState() === States.CAROUSEL) openPage();
}

function cardLayoutForIndex(i, aidx) {
  const dist = (i - aidx + 7) % 7;
  return getCardProps(dist);
}

function bindEvents() {
  document.getElementById('btn-close').addEventListener('click', () => {
    if (!isTransitioning() && getState() === States.PAGE_OPEN) closePage();
  });
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (!isTransitioning() && getState() === States.CAROUSEL) switchPrev();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    if (!isTransitioning() && getState() === States.CAROUSEL) switchNext();
  });
  document.getElementById('btn-add-todo').addEventListener('click', addTodo);

  document.addEventListener('keydown', (e) => {
    if (isTransitioning()) return;
    const s = getState();
    if (e.key === 'ArrowLeft' && s === States.CAROUSEL) switchPrev();
    else if (e.key === 'ArrowRight' && s === States.CAROUSEL) switchNext();
    else if (e.key === 'Enter' && s === States.CAROUSEL) openPage();
    else if (e.key === 'Escape' && s === States.PAGE_OPEN) closePage();
  });

  let wheelLock = false;
  document.getElementById('carousel-scene').addEventListener('wheel', (e) => {
    if (isTransitioning() || getState() !== States.CAROUSEL || wheelLock) return;
    wheelLock = true;
    if (e.deltaY > 0) switchNext(); else switchPrev();
    setTimeout(() => { wheelLock = false; }, 350);
  }, { passive: true });

  let touchStartX = 0;
  document.getElementById('carousel-scene').addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  document.getElementById('carousel-scene').addEventListener('touchend', (e) => {
    if (isTransitioning() || getState() !== States.CAROUSEL) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) { if (delta < 0) switchNext(); else switchPrev(); }
  }, { passive: true });
}

// === 启动 ===
document.addEventListener('DOMContentLoaded', () => {
  initVanta();

  // 登录表单事件
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  const logoutBtn = document.getElementById('logout-btn');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('.login-btn');
    addRipple(btn, e);
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    try {
      await handleLogin(u, p);
      hideLogin();
      await startApp();
    } catch (err) { alert(err.message); }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = registerForm.querySelector('.login-btn');
    addRipple(btn, e);
    const u = document.getElementById('reg-user').value;
    const p = document.getElementById('reg-pass').value;
    try {
      await handleRegister(u, p);
      hideLogin();
      await startApp();
    } catch (err) { alert(err.message); }
  });

  showRegBtn.addEventListener('click', () => {
    animateFormSwitch(registerForm, loginForm);
  });

  showLoginBtn.addEventListener('click', () => {
    animateFormSwitch(loginForm, registerForm);
  });

  logoutBtn.addEventListener('click', () => { logout(); });

  // 如果有 token，直接进入
  if (authToken) {
    document.getElementById('login-scene').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('user-panel').style.display = 'flex';
    document.getElementById('username-display').textContent = currentUser;
    startApp();
  } else {
    showLogin();
  }
});

async function startApp() {
  try {
    bindEvents();
    initPomoEvents();
    await initCarousel(handleCardConfirm);

    const activeIdx = parseInt(document.querySelector('.card.is-active')?.dataset.index || '0');
    const allCards = document.querySelectorAll('.card');
    gsap.fromTo(allCards,
      { x: 0, y: 0, scale: 0.5, opacity: 0, rotation: 0 },
      {
        x: (i) => cardLayoutForIndex(i, activeIdx).x,
        y: (i) => cardLayoutForIndex(i, activeIdx).y,
        scale: (i) => cardLayoutForIndex(i, activeIdx).scale,
        opacity: (i) => cardLayoutForIndex(i, activeIdx).opacity,
        rotation: (i) => cardLayoutForIndex(i, activeIdx).rotation,
        duration: 0.7, ease: 'power2.out', stagger: 0.04,
      }
    );
  } catch (e) {
    console.error(e);
    if (e.message === '未登录') logout();
  }
}
