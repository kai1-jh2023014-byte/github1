const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

const schedule = [
  {
    className: '3組',
    day: 1,
    period: 1,
    subject: '数学',
    task: '問題集 12-15',
    items: ['教科書', 'ノート', '定規']
  },
  {
    className: '3組',
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
const reminderMessage = document.querySelector('#reminder-message');
const checklist = document.querySelector('#packing-checklist');
const quickInputResult = document.querySelector('#quick-input-result');
const syncStatus = document.querySelector('#sync-status');

function parseItems(text) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitJapaneseList(text) {
  return text
    .split(/[、,と]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDayFromText(text) {
  const today = new Date().getDay();
  if (text.includes('明日')) {
    return (today + 1) % 7;
  }
  if (text.includes('今日')) {
    return today;
  }

  const map = {
    月: 1,
    火: 2,
    水: 3,
    木: 4,
    金: 5,
    土: 6,
    日: 0
  };

  for (const [key, value] of Object.entries(map)) {
    if (text.includes(`${key}曜`)) {
      return value;
    }
  }

  return today;
}

function getClubDaySet() {
  const checked = [...document.querySelectorAll('.club-day:checked')];
  return new Set(checked.map((box) => Number(box.value)));
}

function getClubItems() {
  return parseItems(document.querySelector('#club-items').value);
}

function upsertScheduleEntry(newEntry) {
  const index = schedule.findIndex(
    (entry) =>
      entry.className === newEntry.className &&
      entry.day === newEntry.day &&
      entry.period === newEntry.period
  );

  if (index >= 0) {
    schedule[index] = newEntry;
  } else {
    schedule.push(newEntry);
  }

  syncStatus.textContent = `同期状態: 更新済み（${new Date().toLocaleTimeString('ja-JP')}）`;
}

function createCellText(entry) {
  const parts = [`${entry.className} ${entry.subject}`];
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
      const entries = schedule
        .filter((item) => item.day === day && item.period === period)
        .sort((a, b) => a.className.localeCompare(b.className));

      if (entries.length > 0) {
        td.textContent = entries.map(createCellText).join('\n\n');
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
        entryTitle.textContent = `${entry.period}限 ${entry.className} ${entry.subject}`;

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

function notify(title, body) {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

function requiredItemsForDay(day) {
  const lessonItems = schedule
    .filter((entry) => entry.day === day)
    .flatMap((entry) => entry.items);

  const resultSet = new Set(lessonItems);
  const clubDays = getClubDaySet();
  if (clubDays.has(day)) {
    getClubItems().forEach((item) => resultSet.add(item));
  }

  return [...resultSet];
}

function buildChecklistForDay(day) {
  checklist.textContent = '';
  const items = requiredItemsForDay(day);

  if (items.length === 0) {
    reminderMessage.textContent = 'この日の必要な持ち物はありません。';
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.item = item;
    const text = document.createElement('span');
    text.textContent = `${item} をカバンに入れた`;

    label.appendChild(checkbox);
    label.appendChild(text);
    li.appendChild(label);
    checklist.appendChild(li);
  });

  reminderMessage.textContent = 'チェックリストを作成しました。';
}

function sendNightReminder() {
  const tomorrow = (new Date().getDay() + 1) % 7;
  const items = requiredItemsForDay(tomorrow);

  if (items.length === 0) {
    reminderMessage.textContent = '明日の持ち物は登録されていません。';
    return;
  }

  const message = `明日の持ち物: ${items.join('、')}`;
  reminderMessage.textContent = `前夜通知: ${message}`;
  notify('時卓 前夜パッキング通知', message);
}

function sendMorningReminder() {
  const unchecked = [...checklist.querySelectorAll('input[type="checkbox"]:not(:checked)')].map(
    (box) => box.dataset.item
  );

  if (unchecked.length === 0) {
    reminderMessage.textContent = '全てチェック済みです。忘れ物はありません。';
    return;
  }

  const message = `未チェック: ${unchecked.join('、')}`;
  reminderMessage.textContent = `翌朝再通知: ${message}`;
  notify('時卓 忘れ物再確認', message);
}

function extractByRegex(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function parseQuickInput(text) {
  const className = extractByRegex(text, /(\d組)/) || '3組';
  const period = Number(extractByRegex(text, /(\d)限/)) || 1;
  const day = normalizeDayFromText(text);

  const subject =
    extractByRegex(text, /組の(.+?)は/) || extractByRegex(text, /は(.+?)で/) || '未設定科目';

  const task =
    extractByRegex(text, /(ワーク[^、。と\n]*)/) ||
    extractByRegex(text, /課題[：: ]*([^、。\n]+)/) ||
    '';

  const itemsText =
    extractByRegex(text, /(?:と|、)(.+?)を持ってきて/) || extractByRegex(text, /持ち物[：: ]*([^。\n]+)/);

  const items = splitJapaneseList(itemsText || '').filter((item) => item !== task);

  return {
    className,
    day,
    period,
    subject,
    task,
    items
  };
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const newEntry = {
    className: document.querySelector('#class-name').value,
    day: Number(document.querySelector('#day').value),
    period: Number(document.querySelector('#period').value),
    subject: document.querySelector('#subject').value.trim(),
    task: document.querySelector('#task').value.trim(),
    items: parseItems(document.querySelector('#items').value)
  };

  if (!newEntry.subject || !Number.isInteger(newEntry.period) || newEntry.period < 1 || newEntry.period > 8) {
    return;
  }

  upsertScheduleEntry(newEntry);
  form.reset();
  render();
  quickInputResult.textContent = '手動登録しました。';
});

document.querySelector('#quick-input-btn').addEventListener('click', () => {
  const text = document.querySelector('#quick-input-text').value.trim();
  if (!text) {
    return;
  }

  const parsed = parseQuickInput(text);
  upsertScheduleEntry(parsed);
  render();

  quickInputResult.textContent = `AI仕分け登録: ${dayNames[parsed.day]} ${parsed.period}限 / ${parsed.className} / ${parsed.subject}`;
});

document.querySelector('#build-checklist-btn').addEventListener('click', () => {
  buildChecklistForDay(new Date().getDay());
});
document.querySelector('#night-reminder-btn').addEventListener('click', sendNightReminder);
document.querySelector('#morning-reminder-btn').addEventListener('click', sendMorningReminder);

tableViewBtn.addEventListener('click', showTableView);
calendarViewBtn.addEventListener('click', showCalendarView);

render();
showTableView();
