const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

const schedule = [
  {
    day: 1,
    period: 1,
    subject: '数学',
    task: '問題集 12-15',
    items: ['教科書', 'ノート', '定規']
  },
  {
    day: 2,
    period: 3,
    subject: '英語',
    task: '単語テスト準備',
    items: ['教科書', '単語帳', '筆記用具']
  }
];

const form = document.querySelector('#schedule-form');
const tableView = document.querySelector('#table-view');
const calendarView = document.querySelector('#calendar-view');
const tableViewBtn = document.querySelector('#table-view-btn');
const calendarViewBtn = document.querySelector('#calendar-view-btn');
const checkItemsBtn = document.querySelector('#check-items-btn');
const reminderMessage = document.querySelector('#reminder-message');

function parseItems(text) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createCellText(entry) {
  const parts = [`${entry.subject}`];
  if (entry.task) {
    parts.push(`課題: ${entry.task}`);
  }
  if (entry.items.length > 0) {
    parts.push(`持ち物: ${entry.items.join(' / ')}`);
  }
  return parts.join('\n');
}

function renderTable() {
  tableView.textContent = '';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  ['時限', '月', '火', '水', '木', '金', '土', '日'].forEach((name) => {
    const th = document.createElement('th');
    th.textContent = name;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let period = 1; period <= 8; period += 1) {
    const row = document.createElement('tr');
    const periodCell = document.createElement('th');
    periodCell.textContent = `${period}限`;
    row.appendChild(periodCell);

    [1, 2, 3, 4, 5, 6, 0].forEach((day) => {
      const td = document.createElement('td');
      const entry = schedule.find((item) => item.day === day && item.period === period);
      if (entry) {
        td.textContent = createCellText(entry);
        td.style.whiteSpace = 'pre-line';
      }
      row.appendChild(td);
    });

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  tableView.appendChild(table);
}

function getMonday(baseDate) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function renderCalendar() {
  calendarView.textContent = '';
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const monday = getMonday(new Date());
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const day = date.getDay();

    const box = document.createElement('article');
    box.className = 'calendar-day';

    const title = document.createElement('h3');
    title.textContent = `${date.getMonth() + 1}/${date.getDate()} (${dayNames[day]})`;
    box.appendChild(title);

    const entries = schedule
      .filter((entry) => entry.day === day)
      .sort((a, b) => a.period - b.period);

    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = '予定なし';
      box.appendChild(empty);
    } else {
      entries.forEach((entry) => {
        const entryTitle = document.createElement('p');
        entryTitle.className = 'entry-title';
        entryTitle.textContent = `${entry.period}限 ${entry.subject}`;

        const task = document.createElement('p');
        task.className = 'entry-meta';
        task.textContent = entry.task ? `課題: ${entry.task}` : '課題: なし';

        const items = document.createElement('p');
        items.className = 'entry-meta';
        items.textContent = `持ち物: ${entry.items.join(' / ') || 'なし'}`;

        box.appendChild(entryTitle);
        box.appendChild(task);
        box.appendChild(items);
      });
    }

    grid.appendChild(box);
  }

  calendarView.appendChild(grid);
}

function render() {
  renderTable();
  renderCalendar();
}

function showTableView() {
  tableView.classList.remove('hidden');
  calendarView.classList.add('hidden');
  tableViewBtn.classList.add('active');
  calendarViewBtn.classList.remove('active');
}

function showCalendarView() {
  tableView.classList.add('hidden');
  calendarView.classList.remove('hidden');
  tableViewBtn.classList.remove('active');
  calendarViewBtn.classList.add('active');
}

function notifyMissingItems(missingItems) {
  if (!('Notification' in window)) {
    return;
  }

  const message = `忘れ物: ${missingItems.join('、')}`;
  if (Notification.permission === 'granted') {
    new Notification('持ち物チェック', { body: message });
    return;
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification('持ち物チェック', { body: message });
      }
    });
  }
}

function checkMissingItems() {
  const today = new Date().getDay();
  const todayEntries = schedule.filter((entry) => entry.day === today);
  if (todayEntries.length === 0) {
    reminderMessage.textContent = '今日は授業予定がありません。';
    return;
  }

  const packedItems = parseItems(document.querySelector('#packed-items').value);
  const requiredItems = new Set();
  todayEntries.forEach((entry) => {
    entry.items.forEach((item) => requiredItems.add(item));
  });

  const missingItems = [...requiredItems].filter((item) => !packedItems.includes(item));

  if (missingItems.length === 0) {
    reminderMessage.textContent = '忘れ物はありません。';
    return;
  }

  reminderMessage.textContent = `忘れ物の可能性: ${missingItems.join('、')}`;
  notifyMissingItems(missingItems);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const day = Number(document.querySelector('#day').value);
  const period = Number(document.querySelector('#period').value);
  const subject = document.querySelector('#subject').value.trim();
  const task = document.querySelector('#task').value.trim();
  const items = parseItems(document.querySelector('#items').value);

  if (!subject || !Number.isInteger(period) || period < 1 || period > 8) {
    return;
  }

  const existingIndex = schedule.findIndex((item) => item.day === day && item.period === period);
  const newEntry = { day, period, subject, task, items };

  if (existingIndex >= 0) {
    schedule[existingIndex] = newEntry;
  } else {
    schedule.push(newEntry);
  }

  form.reset();
  render();
});

tableViewBtn.addEventListener('click', showTableView);
calendarViewBtn.addEventListener('click', showCalendarView);
checkItemsBtn.addEventListener('click', checkMissingItems);

render();
showTableView();
