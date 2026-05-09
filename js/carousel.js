import { loadData, getTodayIndex, getTodayStats, getWeekCompletedDays, getLastWeekCompletedDays, DAY_KEYS, DAY_LABELS_SHORT, DAY_LABELS } from './data.js';

let activeIndex = 0;
let cards = [];
let onCardConfirm = null;

const carouselEl = () => document.getElementById('carousel');

// 根据距离活跃卡片的位置计算样式
function getCardProps(distFromActive) {
  if (distFromActive === 0) {
    return {
      x: -30,
      y: -40,
      scale: 1.08,
      opacity: 1,
      rotation: 0,
      zIndex: 100,
    };
  }
  const d = distFromActive;
  return {
    x: 25 + d * 22,
    y: d * 14,
    scale: Math.max(0.72, 0.96 - d * 0.04),
    opacity: Math.max(0.2, 0.75 - d * 0.09),
    rotation: d * 1.5,
    zIndex: 100 - d,
  };
}

// 计算每张卡片在当前 activeIndex 下的距离
function getDistFromActive(i) {
  const dist = (i - activeIndex + 7) % 7;
  return dist;
}

function positionCards(animated = true) {
  cards.forEach((card, i) => {
    const dist = getDistFromActive(i);
    const props = getCardProps(dist);
    card.style.zIndex = props.zIndex;

    const transform = {
      x: props.x,
      y: props.y,
      scale: props.scale,
      rotation: props.rotation,
      opacity: props.opacity,
    };

    if (animated) {
      gsap.to(card, {
        ...transform,
        duration: 0.5,
        ease: 'power2.out',
      });
    } else {
      gsap.set(card, transform);
    }
  });
}

function renderCardContent(card, dayKey, index) {
  const todos = loadData().days[dayKey]?.todos || [];
  const doneCount = todos.filter(t => t.done).length;
  const rate = todos.length > 0 ? (doneCount / todos.length * 100) : 0;
  const todayIdx = getTodayIndex();

  card.classList.toggle('is-today', index === todayIdx);

  card.innerHTML = `
    <span class="card-day">${DAY_LABELS_SHORT[index]}</span>
    <span class="card-date">${DAY_LABELS[index]}</span>
    <div class="card-progress-bar">
      <div class="card-progress-fill" style="width:${rate}%"></div>
    </div>
    <span class="card-count">${doneCount}/${todos.length} 完成</span>
    <div class="card-preview-items">
      ${todos.slice(0, 3).map(t =>
        `<span class="card-preview-item ${t.done ? 'is-done' : ''}">${t.text}</span>`
      ).join('')}
    </div>
  `;
}

export function initCarousel(confirmHandler) {
  onCardConfirm = confirmHandler;

  const carousel = carouselEl();
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
  updateStats();
}

export function refreshCards() {
  cards.forEach((card, i) => {
    renderCardContent(card, DAY_KEYS[i], i);
  });
  updateStats();
}

function handleCardClick(index) {
  if (index === activeIndex) {
    if (onCardConfirm) onCardConfirm(activeIndex);
  } else {
    switchTo(index);
  }
}

export function switchTo(index) {
  if (index === activeIndex) return;
  activeIndex = index;
  updateActiveCard();
  updateIndicator();
  positionCards(true);
}

export function switchNext() {
  switchTo((activeIndex + 1) % 7);
}

export function switchPrev() {
  switchTo((activeIndex - 1 + 7) % 7);
}

function updateActiveCard() {
  cards.forEach((c, i) => c.classList.toggle('is-active', i === activeIndex));
}

function renderIndicator() {
  const indicator = document.getElementById('carousel-indicator');
  indicator.innerHTML = DAY_LABELS_SHORT.map((label, i) =>
    `<span class="indicator-dot ${i === activeIndex ? 'is-active' : ''}" data-index="${i}"></span>`
  ).join('');

  indicator.querySelectorAll('.indicator-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      switchTo(parseInt(dot.dataset.index));
    });
  });
}

function updateIndicator() {
  document.querySelectorAll('.indicator-dot').forEach((dot, i) => {
    dot.classList.toggle('is-active', i === activeIndex);
  });
}

export function getActiveIndex() { return activeIndex; }
export function getActiveCard() { return cards[activeIndex]; }
export function getCards() { return cards; }
export function getOtherCards() { return cards.filter((_, i) => i !== activeIndex); }
export function getActiveDayKey() { return DAY_KEYS[activeIndex]; }

// 重置卡片到正确的堆叠位置（转场动画完成后调用）
export function resetCardPositions() {
  cards.forEach((card, i) => {
    const dist = getDistFromActive(i);
    const props = getCardProps(dist);
    card.style.zIndex = props.zIndex;
    gsap.set(card, {
      x: props.x,
      y: props.y,
      scale: props.scale,
      rotation: props.rotation,
      opacity: props.opacity,
    });
  });
}

function updateStats() {
  const today = getTodayStats();
  const weekDays = getWeekCompletedDays();
  const lastWeekDays = getLastWeekCompletedDays();
  const CIRC = 2 * Math.PI * 20; // 125.66, r=20 的周长

  // 今日圆环
  const todayRate = today.total > 0 ? today.done / today.total : 0;
  const todayFill = document.querySelector('#stat-today .stat-ring-fill');
  const todayNum = document.querySelector('#stat-today .stat-ring-number');
  if (todayFill) todayFill.style.strokeDashoffset = CIRC * (1 - todayRate);
  if (todayNum) todayNum.textContent = `${today.done}/${today.total}`;

  // 本周圆环（7 天）
  const weekRate = weekDays / 7;
  const weekFill = document.querySelector('#stat-week .stat-ring-fill');
  const weekNum = document.querySelector('#stat-week .stat-ring-number');
  if (weekFill) weekFill.style.strokeDashoffset = CIRC * (1 - weekRate);
  if (weekNum) weekNum.textContent = `${weekDays}`;

  // 上周圆环（7 天）
  const lastWeekRate = lastWeekDays / 7;
  const lastWeekFill = document.querySelector('#stat-last-week .stat-ring-fill');
  const lastWeekNum = document.querySelector('#stat-last-week .stat-ring-number');
  if (lastWeekFill) lastWeekFill.style.strokeDashoffset = CIRC * (1 - lastWeekRate);
  if (lastWeekNum) lastWeekNum.textContent = `${lastWeekDays}`;
}
