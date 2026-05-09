import { getDay, saveDay, DAY_LABELS } from './data.js';

let currentDayKey = null;
let saveTimeout = null;

const DAY_MAP = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6
};

export function renderPage(dayKey) {
  currentDayKey = dayKey;
  const todos = getDay(dayKey);
  const title = document.getElementById('page-title');
  const progress = document.getElementById('page-progress');
  const list = document.getElementById('todo-list');
  const dayIndex = DAY_MAP[dayKey];

  title.textContent = DAY_LABELS[dayIndex];

  list.innerHTML = '';
  todos.forEach(todo => {
    list.appendChild(createTodoItem(todo));
  });

  updateProgress();

  // Ensure add button exists
  if (!document.getElementById('btn-add-todo')) {
    const btn = document.createElement('button');
    btn.id = 'btn-add-todo';
    btn.textContent = '+ 添加任务';
    btn.addEventListener('click', addTodo);
    document.getElementById('page-body').appendChild(btn);
  }
}

export function clearPage() {
  currentDayKey = null;
  document.getElementById('todo-list').innerHTML = '';
}

function createTodoItem(todo) {
  const li = document.createElement('li');
  li.className = `todo-item ${todo.done ? 'is-done' : ''}`;
  li.dataset.id = todo.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-checkbox';
  checkbox.checked = todo.done;
  checkbox.addEventListener('change', () => toggleTodo(todo.id, checkbox.checked));

  const text = document.createElement('span');
  text.className = 'todo-text';
  text.contentEditable = true;
  text.textContent = todo.text;
  text.addEventListener('input', () => {
    todo.text = text.textContent;
    debouncedSave();
  });
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      text.blur();
    }
  });

  const del = document.createElement('button');
  del.className = 'todo-delete';
  del.innerHTML = '&times;';
  del.addEventListener('click', () => deleteTodo(todo.id));

  li.append(checkbox, text, del);
  return li;
}

function toggleTodo(id, done) {
  const todos = getDay(currentDayKey);
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.done = done;
    saveDay(currentDayKey, todos);
    const li = document.querySelector(`.todo-item[data-id="${id}"]`);
    if (li) li.classList.toggle('is-done', done);
    updateProgress();
  }
}

function deleteTodo(id) {
  const todos = getDay(currentDayKey).filter(t => t.id !== id);
  saveDay(currentDayKey, todos);
  const li = document.querySelector(`.todo-item[data-id="${id}"]`);
  if (li) {
    gsap.to(li, {
      opacity: 0,
      height: 0,
      padding: 0,
      marginBottom: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        li.remove();
        updateProgress();
      }
    });
  }
}

function addTodo() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const todo = { id, text: '', done: false };
  const todos = getDay(currentDayKey);
  todos.push(todo);
  saveDay(currentDayKey, todos);

  const list = document.getElementById('todo-list');
  const li = createTodoItem(todo);
  gsap.fromTo(li, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
  list.appendChild(li);
  li.querySelector('.todo-text').focus();
  updateProgress();
}

function updateProgress() {
  const todos = getDay(currentDayKey);
  const done = todos.filter(t => t.done).length;
  const el = document.getElementById('page-progress');
  if (el) el.textContent = `${done}/${todos.length} 完成`;
}

function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (currentDayKey) {
      const todos = [];
      document.querySelectorAll('.todo-item').forEach(li => {
        todos.push({
          id: li.dataset.id,
          text: li.querySelector('.todo-text').textContent,
          done: li.querySelector('.todo-checkbox').checked
        });
      });
      saveDay(currentDayKey, todos);
    }
  }, 300);
}

export function getCurrentDayKey() { return currentDayKey; }
