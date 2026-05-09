const STORAGE_KEY = 'milk_card_data';
const ARCHIVE_KEY = 'milk_card_archive';
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const DAY_LABELS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function getWeekId() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - jan1) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getPrevWeekId() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - jan1) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function createEmptyData() {
  const data = { weekId: getWeekId(), days: {} };
  DAY_KEYS.forEach(key => {
    data.days[key] = { todos: [] };
  });
  return data;
}

// 周切换时将旧数据归档
function archiveIfNeeded(data) {
  if (data.weekId !== getWeekId()) {
    const archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '{}');
    archive[data.weekId] = data;
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  }
}

export function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.weekId === getWeekId()) return data;
      archiveIfNeeded(data);
    } catch (e) { /* corrupt data, reset */ }
  }
  const fresh = createEmptyData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function persistData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveDay(dayKey, todos) {
  const data = loadData();
  data.days[dayKey] = { todos };
  persistData(data);
}

export function getDay(dayKey) {
  return loadData().days[dayKey]?.todos || [];
}

export function getTodayKey() {
  return DAY_KEYS[getTodayIndex()];
}

// 今日完成情况
export function getTodayStats() {
  const todos = getDay(getTodayKey());
  const done = todos.filter(t => t.done).length;
  return { done, total: todos.length };
}

// 计算某周数据中有几天是"完成日"（有任务且全部完成）
function countCompletedDays(data) {
  if (!data || !data.days) return 0;
  let count = 0;
  DAY_KEYS.forEach(key => {
    const todos = data.days[key]?.todos || [];
    if (todos.length > 0 && todos.every(t => t.done)) count++;
  });
  return count;
}

// 本周完成天数
export function getWeekCompletedDays() {
  const data = loadData();
  return countCompletedDays(data);
}

// 上周完成天数
export function getLastWeekCompletedDays() {
  const archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '{}');
  const prevId = getPrevWeekId();
  const prevData = archive[prevId];
  return countCompletedDays(prevData);
}

export function getTodayIndex() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export { DAY_KEYS, DAY_LABELS, DAY_LABELS_SHORT };
