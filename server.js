const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dns = require('dns').promises;
const net = require('net');
const Database = require('better-sqlite3');
const multer = require('multer');
const crypto = require('crypto');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const notify = require('./notify');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'family.db');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
const reminderRetryAfter = new Map();

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    avatar TEXT NOT NULL DEFAULT '🐱',
    color TEXT NOT NULL DEFAULT '#ff9f43',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    image TEXT,
    category TEXT DEFAULT '家常菜',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dish_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    meal TEXT NOT NULL CHECK (meal IN ('lunch', 'dinner')),
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, meal, date)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dish_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, dish_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT NOT NULL,
    dish_name TEXT,
    meal TEXT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS notify_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    meal TEXT NOT NULL CHECK (meal IN ('lunch','dinner')),
    vote_date TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS vote_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vote_id INTEGER NOT NULL,
    dish_id INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vote_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vote_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(vote_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal TEXT NOT NULL UNIQUE CHECK (meal IN ('lunch','dinner')),
    remind_time TEXT NOT NULL DEFAULT '10:30',
    enabled INTEGER DEFAULT 1,
    last_triggered_date TEXT
  );

  -- 初始化默认提醒时间
  INSERT OR IGNORE INTO reminders (meal, remind_time) VALUES ('lunch', '10:30');
  INSERT OR IGNORE INTO reminders (meal, remind_time) VALUES ('dinner', '16:30');

  CREATE INDEX IF NOT EXISTS idx_selections_date_meal ON selections(date, meal);
  CREATE INDEX IF NOT EXISTS idx_selections_user_meal_date ON selections(user_id, meal, date);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_vote_options_vote_id ON vote_options(vote_id);
  CREATE INDEX IF NOT EXISTS idx_vote_selections_vote_id ON vote_selections(vote_id);
`);

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));
app.use(express.json({ limit: '200kb' }));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: req => req.method === 'GET' || req.method === 'HEAD'
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '7d',
  setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff')
}));

const IMAGE_TYPES = new Map([
  ['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif']
]);

function positiveInt(value) {
  const result = Number(value);
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}

function isMeal(value) {
  return value === 'lunch' || value === 'dinner';
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function cleanCategory(value) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 30) : '家常菜';
}

function isPrivateIp(address) {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
}

async function validatePublicImageUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error('图片地址必须是公开的 http(s) 地址');
  }
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('图片地址不能指向本机或内网');
  }
  return url;
}

// ---------- SSE 实时通知 ----------
const sseClients = new Set();

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// 心跳: 防止代理(如 cpolar)/空闲连接被中间层掐断
setInterval(() => {
  const payload = `data: ${JSON.stringify({ type: 'ping' })}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch (e) { sseClients.delete(client); }
  }
}, 25000).unref();

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch (e) { sseClients.delete(client); }
  }
}

function pushNotification({ user_id, user_name, dish_name, meal, type, message }) {
  const info = db.prepare(
    'INSERT INTO notifications (user_id, user_name, dish_name, meal, type, message) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(user_id || null, user_name, dish_name, meal, type, message);
  const note = db.prepare('SELECT * FROM notifications WHERE id = ?').get(info.lastInsertRowid);
  broadcast({ type: 'notification', note });
  return note;
}

// ---------- 人物 API ----------
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY id').all();
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { name, avatar, color } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '人物名称不能为空' });
  const cleanName = name.trim().slice(0, 12);
  const cleanAvatar = typeof avatar === 'string' && avatar.trim() ? avatar.trim().slice(0, 8) : '🐱';
  const cleanColor = typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#ff9f43';
  const exists = db.prepare('SELECT id FROM users WHERE name = ?').get(cleanName);
  if (exists) return res.status(400).json({ error: '这个名字已经有人用了' });
  const info = db.prepare(
    'INSERT INTO users (name, avatar, color) VALUES (?, ?, ?)'
  ).run(cleanName, cleanAvatar, cleanColor);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  broadcast({ type: 'user_added', user });
  res.json(user);
});

// ---------- 菜品 API ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = IMAGE_TYPES.get(file.mimetype) || '.jpg';
    cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('只支持图片文件'));
  }
});

app.get('/api/categories', (req, res) => {
  const cats = db.prepare(
    `SELECT category, COUNT(*) AS count FROM dishes GROUP BY category ORDER BY MIN(id)`
  ).all();
  res.json(cats);
});

app.get('/api/dishes', (req, res) => {
  const { category, q } = req.query;
  let sql = 'SELECT * FROM dishes';
  const conds = [];
  const params = [];
  if (typeof category === 'string' && category !== '全部') { conds.push('category = ?'); params.push(category.slice(0, 30)); }
  if (typeof q === 'string' && q.trim()) { const term = q.trim().slice(0, 40); conds.push('(name LIKE ? OR description LIKE ?)'); params.push(`%${term}%`, `%${term}%`); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/dishes', upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, category, image_url } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '菜品名称不能为空' });
    const cleanName = name.trim().slice(0, 40);
    const dup = db.prepare('SELECT id FROM dishes WHERE name = ?').get(cleanName);
    if (dup) return res.status(400).json({ error: '这道菜已经上架啦,换个名字试试' });
    let image = req.file ? '/uploads/' + req.file.filename : null;
    let warning = null;
    // 支持从 URL 下载图片
    if (!image && image_url && image_url.trim()) {
      let url;
      try {
        url = await validatePublicImageUrl(image_url.trim());
      } catch (e) {
        return res.status(400).json({ error: e.message || '图片地址格式不正确' });
      }
      try {
        const aborter = new AbortController();
        const timeout = setTimeout(() => aborter.abort(), 10000);
        const response = await fetch(url, { signal: aborter.signal, redirect: 'error' });
        clearTimeout(timeout);
        const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
        const contentLength = Number(response.headers.get('content-length') || 0);
        if (!response.ok || !IMAGE_TYPES.has(contentType) || contentLength > 5 * 1024 * 1024) {
          throw new Error('图片响应无效');
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > 5 * 1024 * 1024) throw new Error('图片过大');
        const ext = IMAGE_TYPES.get(contentType);
        const fname = `dish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        const dest = path.join(UPLOAD_DIR, fname);
        fs.writeFileSync(dest, buffer);
        image = '/uploads/' + fname;
      } catch (e) {
        warning = '图片下载失败,已使用默认占位图';
      }
    }
    const info = db.prepare(
      'INSERT INTO dishes (name, description, image, category) VALUES (?, ?, ?, ?)'
    ).run(cleanName, typeof description === 'string' ? description.trim().slice(0, 200) : '', image, cleanCategory(category));
    const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(info.lastInsertRowid);
    if (warning) dish.warning = warning;
    broadcast({ type: 'dish_added', dish });
    res.json(dish);
  } catch (e) {
    next(e);
  }
});

app.delete('/api/dishes/:id', (req, res) => {
  const dishId = positiveInt(req.params.id);
  if (!dishId) return res.status(400).json({ error: '菜品编号无效' });
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(dishId);
  if (!dish) return res.status(404).json({ error: '菜品不存在' });
  db.transaction(() => {
    db.prepare('DELETE FROM selections WHERE dish_id = ?').run(dishId);
    db.prepare('DELETE FROM favorites WHERE dish_id = ?').run(dishId);
    db.prepare('DELETE FROM vote_options WHERE dish_id = ?').run(dishId);
    db.prepare('DELETE FROM dishes WHERE id = ?').run(dishId);
  })();
  if (dish.image) {
    const file = path.join(UPLOAD_DIR, path.basename(dish.image));
    try { fs.unlinkSync(file); } catch (e) {}
  }
  broadcast({ type: 'dish_removed', id: dishId });
  res.json({ ok: true });
});

// ---------- 选菜 API ----------
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isPlannableDate(value) {
  if (!isDate(value)) return false;
  const start = new Date(`${todayStr()}T00:00:00`).getTime();
  const target = new Date(`${value}T00:00:00`).getTime();
  return target >= start && target <= start + 6 * 86400000;
}

app.get('/api/meal', (req, res) => {
  const date = req.query.date || todayStr();
  const meal = req.query.meal;
  if (!isDate(date) || !isMeal(meal)) return res.status(400).json({ error: '日期或时段无效' });
  const list = db.prepare(
    `SELECT s.user_id, s.meal, s.date, d.id AS dish_id, d.name AS dish_name, d.image,
            u.name AS user_name, u.avatar AS user_avatar, u.color AS user_color
     FROM selections s
     JOIN dishes d ON s.dish_id = d.id
     JOIN users u ON s.user_id = u.id
     WHERE s.date = ? AND s.meal = ? ORDER BY s.created_at`
  ).all(date, meal);
  res.json(list);
});

app.get('/api/my-selection', (req, res) => {
  const { user_id, meal, date } = req.query;
  if (!user_id || !meal || !date) return res.json(null);
  if (!positiveInt(user_id) || !isMeal(meal) || !isDate(date)) return res.status(400).json({ error: '参数无效' });
  const row = db.prepare(
    'SELECT s.*, d.name AS dish_name, d.image FROM selections s JOIN dishes d ON s.dish_id = d.id WHERE s.user_id = ? AND s.meal = ? AND s.date = ?'
  ).get(user_id, meal, date);
  res.json(row || null);
});

app.post('/api/select', (req, res) => {
  const { dish_id, user_id, meal, date: requestedDate } = req.body;
  const dishId = positiveInt(dish_id);
  const userId = positiveInt(user_id);
  if (!dishId || !userId) return res.status(400).json({ error: '参数不完整' });
  if (!['lunch', 'dinner'].includes(meal)) return res.status(400).json({ error: '时段无效' });
  const date = requestedDate || todayStr();
  if (!isPlannableDate(date)) return res.status(400).json({ error: '只能安排今天起 7 天内的菜单' });
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(dishId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!dish) return res.status(404).json({ error: '菜品不存在' });
  if (!user) return res.status(404).json({ error: '人物不存在' });

  const prev = db.prepare('SELECT * FROM selections WHERE user_id = ? AND meal = ? AND date = ?')
    .get(userId, meal, date);

  // 幂等: 选同一道菜不重复通知
  if (prev && prev.dish_id === dish.id) return res.json({ ok: true, changed: false });

  const tx = db.transaction(() => {
    if (prev) db.prepare('DELETE FROM selections WHERE id = ?').run(prev.id);
    db.prepare('INSERT INTO selections (dish_id, user_id, meal, date) VALUES (?, ?, ?, ?)')
      .run(dish.id, userId, meal, date);
  });
  tx();

  pushNotification({
    user_id: userId,
    user_name: user.name,
    dish_name: dish.name,
    meal,
    type: prev ? 'change' : 'select',
    message: prev
      ? `${user.name} 把${meal === 'lunch' ? '午饭' : '晚饭'}换成了「${dish.name}」`
      : `${user.name} 的${meal === 'lunch' ? '午饭' : '晚饭'}想吃「${dish.name}」`
  });

  res.json({ ok: true });

  // 触发邮件/短信通知(异步,不阻塞响应)
  const targets = db.prepare('SELECT * FROM notify_targets ORDER BY id').all();
  notify.notifySelection({ user_name: user.name, dish_name: dish.name, meal, targets })
    .catch(error => console.error('[通知发送失败]', error.message));
});

app.post('/api/notify', (req, res) => {
  const { user_id, message } = req.body;
  const userId = positiveInt(user_id);
  const user = userId ? db.prepare('SELECT * FROM users WHERE id = ?').get(userId) : null;
  if (!user) return res.status(400).json({ error: '参数不完整' });
  const note = pushNotification({
    user_id: user.id,
    user_name: user.name,
    type: 'notify',
    message: typeof message === 'string' && message.trim() ? message.trim().slice(0, 120) : `${user.name} 呼叫大家: 出来吃饭啦!`
  });
  res.json(note);
});

app.get('/api/notifications', (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  res.json(db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT ?').all(limit));
});

// ---------- 收藏 API ----------
app.get('/api/favorites', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.json([]);
  if (!positiveInt(user_id)) return res.status(400).json({ error: '用户编号无效' });
  const list = db.prepare(
    `SELECT d.* FROM favorites f JOIN dishes d ON f.dish_id = d.id WHERE f.user_id = ? ORDER BY f.id DESC`
  ).all(user_id);
  res.json(list);
});

app.post('/api/favorites', (req, res) => {
  const { user_id, dish_id } = req.body;
  const userId = positiveInt(user_id);
  const dishId = positiveInt(dish_id);
  if (!userId || !dishId) return res.status(400).json({ error: '参数不完整' });
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId) || !db.prepare('SELECT 1 FROM dishes WHERE id = ?').get(dishId)) return res.status(404).json({ error: '用户或菜品不存在' });
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, dish_id) VALUES (?, ?)').run(userId, dishId);
  res.json({ ok: true });
});

app.delete('/api/favorites/:user_id/:dish_id', (req, res) => {
  const userId = positiveInt(req.params.user_id);
  const dishId = positiveInt(req.params.dish_id);
  if (!userId || !dishId) return res.status(400).json({ error: '参数无效' });
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND dish_id = ?').run(userId, dishId);
  res.json({ ok: true });
});

// ---------- 历史 API ----------
app.get('/api/history', (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 30);
  const d = new Date();
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(d.getTime() - i * 86400000);
    dates.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
  }
  const list = db.prepare(
    `SELECT s.date, s.meal, d.name AS dish_name, u.name AS user_name, u.avatar AS user_avatar, u.color AS user_color
     FROM selections s JOIN dishes d ON s.dish_id = d.id JOIN users u ON s.user_id = u.id
     WHERE s.date >= ? ORDER BY s.date DESC, s.created_at`
  ).all(dates[0]);
  res.json({ dates, list });
});

// ---------- 一周食谱 API ----------
app.get('/api/weekly', (req, res) => {
  const today = todayStr();
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    week.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }
  const rows = db.prepare(
    `SELECT s.*, d.name AS dish_name, d.image, d.category, u.name AS user_name, u.avatar AS user_avatar, u.color AS user_color
     FROM selections s JOIN dishes d ON s.dish_id = d.id JOIN users u ON s.user_id = u.id
     WHERE s.date >= ? AND s.date <= ? ORDER BY s.date, s.meal, s.created_at`
  ).all(week[0], week[6]);
  res.json({ week, today, list: rows });
});

// ---------- 历史推荐 API ----------
app.get('/api/recommendations', (req, res) => {
  const freq = db.prepare(
    `SELECT d.id, d.name, d.image, d.category, COUNT(*) AS times
     FROM selections s JOIN dishes d ON s.dish_id = d.id
     GROUP BY s.dish_id ORDER BY times DESC LIMIT 5`
  ).all();
  const recent = db.prepare(
    `SELECT DISTINCT s.dish_id FROM selections s WHERE s.date >= date('now','-7 days')`
  ).all().map(r => r.dish_id);
  const never = db.prepare(
    `SELECT d.* FROM dishes d WHERE d.id NOT IN (SELECT DISTINCT dish_id FROM selections) LIMIT 5`
  ).all();
  res.json({ frequent: freq, recent, never });
});

// ---------- 投票 API ----------
app.get('/api/votes', (req, res) => {
  const votes = db.prepare('SELECT * FROM votes ORDER BY created_at DESC LIMIT 20').all();
  const result = votes.map(v => {
    const options = db.prepare(
      `SELECT vo.id, vo.dish_id, d.name AS dish_name, d.image, d.category,
              (SELECT COUNT(*) FROM vote_selections vs WHERE vs.option_id = vo.id) AS vote_count
       FROM vote_options vo JOIN dishes d ON vo.dish_id = d.id WHERE vo.vote_id = ?`
    ).all(v.id);
    const totalVotes = db.prepare('SELECT COUNT(*) AS c FROM vote_selections WHERE vote_id = ?').get(v.id).c;
    const userVote = req.query.user_id
      ? db.prepare('SELECT option_id FROM vote_selections WHERE vote_id = ? AND user_id = ?').get(v.id, req.query.user_id)
      : null;
    return { ...v, options, totalVotes, userVote: userVote ? userVote.option_id : null };
  });
  res.json(result);
});

app.post('/api/votes', (req, res) => {
  const { title, meal, date, dish_ids, created_by } = req.body;
  const dishIds = Array.isArray(dish_ids) ? [...new Set(dish_ids.map(positiveInt).filter(Boolean))] : [];
  const creatorId = created_by == null ? null : positiveInt(created_by);
  const voteDate = date || todayStr();
  if (typeof title !== 'string' || !title.trim() || !isMeal(meal) || !isDate(voteDate) || !dishIds.length || dishIds.length > 12 || (created_by != null && !creatorId)) return res.status(400).json({ error: '投票参数无效' });
  const existing = db.prepare(`SELECT id FROM dishes WHERE id IN (${dishIds.map(() => '?').join(',')})`).all(...dishIds);
  if (existing.length !== dishIds.length) return res.status(400).json({ error: '候选菜品不存在' });
  const createVote = db.transaction(() => {
    const info = db.prepare('INSERT INTO votes (title, meal, vote_date, created_by) VALUES (?, ?, ?, ?)').run(title.trim().slice(0, 60), meal, voteDate, creatorId);
    const voteId = info.lastInsertRowid;
    const stmt = db.prepare('INSERT INTO vote_options (vote_id, dish_id) VALUES (?, ?)');
    dishIds.forEach(dishId => stmt.run(voteId, dishId));
    return voteId;
  });
  const voteId = createVote();
  broadcast({ type: 'vote_created', id: voteId });
  res.json({ id: voteId, ok: true });
});

app.post('/api/votes/:id/vote', (req, res) => {
  const { user_id, option_id } = req.body;
  const voteId = positiveInt(req.params.id);
  const userId = positiveInt(user_id);
  const optionId = positiveInt(option_id);
  if (!voteId || !userId || !optionId) return res.status(400).json({ error: '参数不完整' });
  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(voteId);
  if (!vote || vote.status !== 'open') return res.status(400).json({ error: '投票不存在或已结束' });
  if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(userId) || !db.prepare('SELECT 1 FROM vote_options WHERE id = ? AND vote_id = ?').get(optionId, voteId)) return res.status(400).json({ error: '投票选项无效' });
  db.prepare('INSERT INTO vote_selections (vote_id, user_id, option_id) VALUES (?, ?, ?) ON CONFLICT(vote_id, user_id) DO UPDATE SET option_id = excluded.option_id, created_at = datetime(\'now\', \'localtime\')').run(voteId, userId, optionId);
  broadcast({ type: 'vote_updated', id: voteId });
  res.json({ ok: true });
});

app.post('/api/votes/:id/close', (req, res) => {
  const voteId = positiveInt(req.params.id);
  if (!voteId) return res.status(400).json({ error: '投票编号无效' });
  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(voteId);
  if (!vote) return res.status(404).json({ error: '投票不存在' });
  if (vote.status === 'closed') return res.json({ ok: true, alreadyClosed: true });
  // 自动将最高票转为选中
  const winner = db.prepare(
    `SELECT vo.dish_id, COUNT(*) AS c FROM vote_selections vs
     JOIN vote_options vo ON vs.option_id = vo.id
     WHERE vs.vote_id = ? GROUP BY vo.dish_id ORDER BY c DESC LIMIT 1`
  ).get(voteId);
  db.transaction(() => {
    db.prepare("UPDATE votes SET status='closed' WHERE id = ?").run(voteId);
    if (!winner) return;
    const voters = db.prepare('SELECT DISTINCT user_id FROM vote_selections WHERE vote_id = ?').all(voteId);
    const upsert = db.prepare('INSERT INTO selections (dish_id, user_id, meal, date) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, meal, date) DO UPDATE SET dish_id = excluded.dish_id, created_at = datetime(\'now\', \'localtime\')');
    voters.forEach(({ user_id }) => upsert.run(winner.dish_id, user_id, vote.meal, vote.vote_date));
  })();
  broadcast({ type: 'vote_closed', id: voteId, winner: winner ? winner.dish_id : null });
  res.json({ ok: true });
});

// ---------- 提醒 API ----------
app.get('/api/reminders', (req, res) => {
  res.json(db.prepare('SELECT * FROM reminders ORDER BY meal').all());
});

app.post('/api/reminders', (req, res) => {
  const { meal, remind_time, enabled } = req.body;
  if (!meal || !remind_time) return res.status(400).json({ error: '参数不完整' });
  db.prepare('INSERT OR REPLACE INTO reminders (meal, remind_time, enabled) VALUES (?, ?, ?)').run(meal, remind_time, enabled ? 1 : 0);
  res.json({ ok: true });
});

// 提醒检查(由定时器调用)
let reminderCheckInFlight = false;
async function checkReminders() {
  if (reminderCheckInFlight) return;
  reminderCheckInFlight = true;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const today = todayStr();
  const due = db.prepare(
    "SELECT * FROM reminders WHERE enabled = 1 AND remind_time <= ? AND (last_triggered_date IS NULL OR last_triggered_date != ?)"
  ).all(currentTime, today);
  try {
    for (const reminder of due) {
      const retryAt = reminderRetryAfter.get(reminder.id) || 0;
      if (retryAt > Date.now()) continue;
      const targets = db.prepare('SELECT * FROM notify_targets ORDER BY id').all();
      const result = await notify.notifyReminder({ meal: reminder.meal, time: reminder.remind_time, targets });
      const delivered = [...result.email, ...result.sms].some(item => item.ok);
      if (delivered || !targets.length) {
        db.prepare('UPDATE reminders SET last_triggered_date = ? WHERE id = ?').run(today, reminder.id);
        reminderRetryAfter.delete(reminder.id);
      } else {
        reminderRetryAfter.set(reminder.id, Date.now() + 30 * 60 * 1000);
        console.warn(`[提醒未送达] ${reminder.meal}:`, [...result.email, ...result.sms].map(item => item.error || item.reason).filter(Boolean).join('；'));
      }
    }
  } catch (error) {
    console.error('[提醒检查失败]', error.message);
  } finally {
    reminderCheckInFlight = false;
  }
}
// 每分钟检查一次提醒
setInterval(checkReminders, 60000);

// ---------- 通知 API ----------
app.get('/api/notify/targets', (req, res) => {
  res.json(db.prepare('SELECT * FROM notify_targets ORDER BY id').all());
});

app.post('/api/notify/targets', (req, res) => {
  const { name, email, phone } = req.body;
  if (!name) return res.status(400).json({ error: '请填写名称' });
  if (!email && !phone) return res.status(400).json({ error: '请至少填写邮箱或手机号' });
  const cleanEmail = (email || '').trim();
  const cleanPhone = String(phone || '').replace(/[\s-]/g, '').replace(/^\+86/, '');
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ error: '邮箱格式不正确' });
  if (cleanPhone && !/^1[3-9]\d{9}$/.test(cleanPhone)) return res.status(400).json({ error: '请输入有效的中国大陆手机号' });
  const duplicate = db.prepare('SELECT id FROM notify_targets WHERE (? != \'\' AND email = ?) OR (? != \'\' AND phone = ?)').get(cleanEmail, cleanEmail, cleanPhone, cleanPhone);
  if (duplicate) return res.status(409).json({ error: '该通知方式已经添加' });
  const info = db.prepare('INSERT INTO notify_targets (name, email, phone) VALUES (?, ?, ?)').run(name.trim(), cleanEmail, cleanPhone);
  res.json(db.prepare('SELECT * FROM notify_targets WHERE id = ?').get(info.lastInsertRowid));
});

app.delete('/api/notify/targets/:id', (req, res) => {
  db.prepare('DELETE FROM notify_targets WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/notify/config', (req, res) => {
  const cfg = notify.loadConfig();
  // 不回传密码
  const safe = {
    email: { ...cfg.email, pass: cfg.email.pass ? '***' : '' },
    sms: { ...cfg.sms, accessKeyId: cfg.sms.accessKeyId ? '***' : '', accessKeySecret: cfg.sms.accessKeySecret ? '***' : '', ...notify.getSmsStatus(cfg) },
    targets: cfg.targets || db.prepare('SELECT * FROM notify_targets ORDER BY id').all()
  };
  res.json(safe);
});

app.post('/api/notify/config', (req, res) => {
  const cfg = notify.loadConfig();
  const { email, sms } = req.body;
  if (email) {
    if (email.pass === '***') delete email.pass;
    cfg.email = { ...cfg.email, ...email };
  }
  if (sms) {
    if (sms.accessKeyId === '***') delete sms.accessKeyId;
    if (sms.accessKeySecret === '***') delete sms.accessKeySecret;
    cfg.sms = { ...cfg.sms, ...sms };
    cfg.sms.enabled = Boolean(cfg.sms.accessKeyId && cfg.sms.accessKeySecret && cfg.sms.signName && cfg.sms.templateCode);
  }
  notify.saveConfig(cfg);
  res.json({ ok: true });
});

app.post('/api/notify/test', async (req, res) => {
  const { user_name, dish_name, meal } = req.body;
  const targets = db.prepare('SELECT * FROM notify_targets ORDER BY id').all();
  const r = await notify.notifySelection({ user_name: user_name || '测试', dish_name: dish_name || '红烧肉', meal: meal || 'lunch', targets });
  res.json(r);
});

// ---------- 兜底: API 404 / 错误处理 ----------
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error('[错误]', err.message);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? '图片不能超过 5MB' : '图片上传失败: ' + err.message });
  }
  res.status(500).json({ error: '服务器开小差了,请稍后再试' });
});

// ---------- 启动 ----------
app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  console.log('==========================================');
  console.log('  家庭点菜小程序 v3.1 已启动!');
  console.log(`  本机访问:   http://localhost:${PORT}`);
  for (const ip of ips) {
    console.log(`  局域网访问: http://${ip}:${PORT}`);
  }
  console.log('==========================================');
});
