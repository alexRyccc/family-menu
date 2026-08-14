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
const { travelCities } = require('./travel-cities');

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

  CREATE TABLE IF NOT EXISTS shared_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_date TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    mention_user_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    avatar TEXT NOT NULL DEFAULT '🐱',
    gender TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#d59a3a',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS pet_care_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL,
    care_type TEXT NOT NULL,
    care_date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('place', 'merchant', 'product')),
    description TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    latitude REAL,
    longitude REAL,
    visited_label TEXT NOT NULL DEFAULT '',
    travel_key TEXT NOT NULL DEFAULT '',
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS recommendation_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id INTEGER,
    checkin_date TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    latitude REAL,
    longitude REAL,
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS recommendation_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recommendation_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(recommendation_id) REFERENCES recommendations(id) ON DELETE CASCADE,
    UNIQUE(recommendation_id, image_path)
  );

  -- 初始化默认提醒时间
  INSERT OR IGNORE INTO reminders (meal, remind_time) VALUES ('lunch', '10:30');
  INSERT OR IGNORE INTO reminders (meal, remind_time) VALUES ('dinner', '16:30');
  INSERT OR IGNORE INTO pets (name, avatar, color) VALUES ('妹妹', '🐱', '#e99b80');
  INSERT OR IGNORE INTO pets (name, avatar, color) VALUES ('giao', '😺', '#6ca99e');
  INSERT OR IGNORE INTO pets (name, avatar, color) VALUES ('咩咩', '😸', '#d39a54');

  CREATE INDEX IF NOT EXISTS idx_selections_date_meal ON selections(date, meal);
  CREATE INDEX IF NOT EXISTS idx_selections_user_meal_date ON selections(user_id, meal, date);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_vote_options_vote_id ON vote_options(vote_id);
  CREATE INDEX IF NOT EXISTS idx_vote_selections_vote_id ON vote_selections(vote_id);
  CREATE INDEX IF NOT EXISTS idx_shared_notes_date ON shared_notes(note_date DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_pet_care_records_pet_date ON pet_care_records(pet_id, care_date DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_recommendations_kind ON recommendations(kind, id DESC);
  CREATE INDEX IF NOT EXISTS idx_recommendation_checkins_date ON recommendation_checkins(checkin_date DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_recommendation_images_recommendation ON recommendation_images(recommendation_id, sort_order);
`);

// Existing selections and notes retain their author; only update this family member's visual.
db.prepare("UPDATE users SET avatar = '🐮' WHERE name = '猫姨姨'").run();
if (!db.prepare('PRAGMA table_info(selections)').all().some(column => column.name === 'note')) {
  db.exec("ALTER TABLE selections ADD COLUMN note TEXT NOT NULL DEFAULT ''");
}
if (!db.prepare('PRAGMA table_info(pets)').all().some(column => column.name === 'gender')) {
  db.exec("ALTER TABLE pets ADD COLUMN gender TEXT NOT NULL DEFAULT ''");
}
if (!db.prepare('PRAGMA table_info(recommendations)').all().some(column => column.name === 'visited_label')) {
  db.exec("ALTER TABLE recommendations ADD COLUMN visited_label TEXT NOT NULL DEFAULT ''");
}
if (!db.prepare('PRAGMA table_info(recommendations)').all().some(column => column.name === 'travel_key')) {
  db.exec("ALTER TABLE recommendations ADD COLUMN travel_key TEXT NOT NULL DEFAULT ''");
}
db.prepare("UPDATE pets SET avatar = '/assets/pets/meimei.jpg', gender = '母猫' WHERE name = '妹妹'").run();
db.prepare("UPDATE pets SET avatar = '/assets/pets/giao.jpg', gender = '公猫' WHERE name = 'giao'").run();
db.prepare("UPDATE pets SET avatar = '/assets/pets/miemie.jpg', gender = '母猫' WHERE name = '咩咩'").run();

const seedTravelCities = db.transaction(() => {
  const find = db.prepare("SELECT id FROM recommendations WHERE travel_key = ?");
  const insert = db.prepare('INSERT INTO recommendations (title, kind, description, region, address, latitude, longitude, visited_label, travel_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const update = db.prepare('UPDATE recommendations SET title = ?, kind = ?, description = ?, region = ?, address = ?, latitude = ?, longitude = ?, visited_label = ? WHERE id = ?');
  const addImage = db.prepare('INSERT OR IGNORE INTO recommendation_images (recommendation_id, image_path, caption, sort_order) VALUES (?, ?, ?, ?)');
  const findCheckin = db.prepare('SELECT id FROM recommendation_checkins WHERE recommendation_id = ? AND checkin_date = ?');
  const addCheckin = db.prepare('INSERT INTO recommendation_checkins (recommendation_id, checkin_date, region, address, latitude, longitude, note) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const city of travelCities) {
    const existing = find.get(city.key);
    const id = existing?.id || insert.run(city.name, 'place', city.description, city.country, city.name, city.latitude, city.longitude, city.dateLabel, city.key).lastInsertRowid;
    if (existing) update.run(city.name, 'place', city.description, city.country, city.name, city.latitude, city.longitude, city.dateLabel, id);
    for (let index = 1; index <= 3; index += 1) {
      const imagePath = `/assets/travel/${city.key}-${index}.jpg`;
      if (fs.existsSync(path.join(__dirname, 'public', imagePath))) addImage.run(id, imagePath, `${city.name} · 城市印象 ${index}`, index);
    }
    if (!findCheckin.get(id, city.visitedDate)) {
      const note = city.dateLabel === '2020年' ? '从历史足迹导入，原记录仅标注到 2020 年。' : `从历史足迹导入，点亮时间：${city.dateLabel}。`;
      addCheckin.run(id, city.visitedDate, city.country, city.name, city.latitude, city.longitude, note);
    }
  }
});
seedTravelCities();

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      frameSrc: ["'self'", 'https://www.openstreetmap.org'],
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

const RECIPE_LIBRARY = {
  '红烧肉': {
    duration: '55 分钟', difficulty: '家常', ingredients: [['五花肉', '500g'], ['冰糖', '20g'], ['生抽', '2 汤匙'], ['老抽', '1 汤匙'], ['葱姜', '适量']],
    steps: ['五花肉切 3 厘米块，冷水下锅，煮出浮沫后洗净。', '锅中放少许油，小火将冰糖炒至琥珀色。', '倒入五花肉翻匀上色，加入葱姜、生抽和老抽。', '加热水没过肉块，小火加盖焖 40 分钟。', '开盖转大火收汁，尝味后装盘。'], tip: '全程用热水炖，肉会更软糯。'
  },
  '番茄炒蛋': {
    duration: '12 分钟', difficulty: '入门', ingredients: [['番茄', '2 个'], ['鸡蛋', '3 个'], ['葱花', '少许'], ['盐', '适量'], ['糖', '1 小勺']],
    steps: ['番茄切块，鸡蛋加少许盐打散。', '热锅热油，倒入蛋液，炒至刚凝固后盛出。', '原锅放番茄，中火炒出汁水。', '加入盐和糖调味，倒回鸡蛋快速翻匀。', '撒葱花，关火出锅。'], tip: '鸡蛋不要炒老，最后回锅 20 秒就够。'
  },
  '麻婆豆腐': {
    duration: '20 分钟', difficulty: '家常', ingredients: [['嫩豆腐', '1 盒'], ['牛肉末', '100g'], ['郫县豆瓣酱', '1 汤匙'], ['花椒粉', '少许'], ['蒜末', '1 汤匙']],
    steps: ['豆腐切小方块，入淡盐水中焯 1 分钟后沥干。', '热锅下油，炒香牛肉末和蒜末。', '加入豆瓣酱炒出红油，倒入半碗清水煮开。', '轻推入豆腐，小火煮 5 分钟使其入味。', '淋水淀粉收汁，撒花椒粉和葱花。'], tip: '用推的方式翻动豆腐，不易碎。'
  },
  '可乐鸡翅': {
    duration: '30 分钟', difficulty: '家常', ingredients: [['鸡翅中', '10 个'], ['可乐', '330ml'], ['生抽', '2 汤匙'], ['姜片', '3 片'], ['白芝麻', '少许']],
    steps: ['鸡翅两面划口，冷水下锅焯去血沫并擦干。', '锅中少油，将鸡翅煎至两面金黄。', '放入姜片、生抽和可乐，大火煮开。', '转中小火焖 15 分钟，期间翻面一次。', '大火收至酱汁浓亮，撒芝麻。'], tip: '可乐本身有甜味，通常不用额外加糖。'
  },
  '清蒸鲈鱼': {
    duration: '18 分钟', difficulty: '家常', ingredients: [['鲈鱼', '1 条'], ['姜丝', '适量'], ['葱丝', '适量'], ['蒸鱼豉油', '2 汤匙'], ['热油', '2 汤匙']],
    steps: ['鱼处理干净，在鱼身两侧划刀，放姜片腌 5 分钟。', '水开后上锅，大火蒸 8 至 10 分钟。', '取出倒掉盘中腥水，换上新鲜葱姜丝。', '淋蒸鱼豉油。', '烧热食用油，浇在葱姜丝上即可。'], tip: '蒸鱼时间从水开后开始计算，过久肉会发柴。'
  },
  '蒜蓉粉丝蒸虾': {
    duration: '22 分钟', difficulty: '家常', ingredients: [['鲜虾', '12 只'], ['粉丝', '1 把'], ['蒜', '1 头'], ['生抽', '2 汤匙'], ['小米椒', '可选']],
    steps: ['粉丝温水泡软，铺在盘底；鲜虾开背去虾线。', '蒜末用少许油炒香，加生抽和少许清水调成蒜蓉汁。', '将虾摆在粉丝上，均匀铺上蒜蓉汁。', '水开后上锅蒸 6 分钟。', '出锅撒葱花，喜欢辣味可加小米椒。'], tip: '虾开背后更容易入味，也更好剥。'
  },
  '油焖大虾': {
    duration: '25 分钟', difficulty: '家常', ingredients: [['大虾', '500g'], ['葱姜', '适量'], ['番茄酱', '1 汤匙'], ['生抽', '1 汤匙'], ['糖', '1 小勺']],
    steps: ['大虾剪去虾枪和虾须，挑出虾线并擦干。', '锅中油热后煎虾，压出虾头红油。', '放葱姜、番茄酱、生抽和糖炒匀。', '加少量热水，盖盖焖 5 分钟。', '开盖收浓汤汁，翻匀即可。'], tip: '煎虾前擦干水分，锅里不容易溅油。'
  },
  '白灼虾': {
    duration: '10 分钟', difficulty: '入门', ingredients: [['鲜虾', '500g'], ['姜片', '3 片'], ['葱段', '适量'], ['料酒', '1 汤匙'], ['蘸料', '按喜好']],
    steps: ['鲜虾洗净，剪去长须。', '锅中加水、姜片、葱段和料酒，煮至沸腾。', '倒入鲜虾，水再次沸腾后煮 1 至 2 分钟。', '虾身变红卷曲后立刻捞出。', '配姜醋或生抽蘸料食用。'], tip: '不要久煮，虾肉刚变白弹牙时最好吃。'
  }
};

function fallbackRecipe(dish) {
  const category = dish.category || '家常菜';
  const profiles = {
    '家常菜': { duration: '28 分钟', difficulty: '家常', ingredients: [[dish.name, '1 份'], ['主食材', '适量'], ['葱姜蒜', '适量'], ['生抽和盐', '适量']], steps: ['主食材洗净，切成易熟的均匀大小。', '热锅后下油，先将肉类或耐炒食材炒至变色。', '加入葱姜蒜炒香，再放入配菜。', '沿锅边淋入调味料，快速翻炒至熟。', '尝味后关火，趁热装盘。'] },
    '火锅': { duration: '25 分钟', difficulty: '入门', ingredients: [['火锅底料', '1 份'], ['高汤或清水', '适量'], ['喜欢的肉菜', '适量'], ['蘸料', '按喜好']], steps: ['准备肉类、蔬菜和主食，分别洗净切好。', '锅中加入底料和高汤，煮开后先尝汤底咸淡。', '耐煮食材先下锅，肉片和叶菜分批涮熟。', '按食材熟度依次捞出，搭配蘸料食用。'] },
    '汤羹': { duration: '40 分钟', difficulty: '家常', ingredients: [[dish.name, '1 份'], ['主食材', '适量'], ['葱姜', '适量'], ['盐', '适量']], steps: ['将主食材洗净切成均匀小块。', '锅中少油炒香葱姜和主食材。', '加入热水，大火煮开后转小火慢煮。', '食材软熟后调盐，静置 2 分钟再盛出。'] },
    '面食': { duration: '25 分钟', difficulty: '家常', ingredients: [[dish.name, '1 份'], ['面条或面皮', '1 人份'], ['配菜', '适量'], ['调味料', '适量']], steps: ['准备好主料和配菜，调好一碗基础酱汁。', '烧开足量水，将面条煮至比喜欢的口感略硬一点。', '另起锅炒香配菜和主料。', '倒入面条或面皮，大火翻匀调味后出锅。'] }
    , '海鲜': { duration: '22 分钟', difficulty: '家常', ingredients: [[dish.name, '1 份'], ['鲜海鲜', '500g'], ['姜蒜', '适量'], ['料酒', '1 汤匙'], ['生抽', '适量']], steps: ['海鲜洗净，去除不可食部分并擦干表面水分。', '用姜片和少量料酒短暂腌制去腥。', '热锅下油，先煎或炒至刚变色。', '加入蒜末和调味料，按食材大小焖至熟透。', '撒葱花，立即出锅避免肉质变老。'] }
    , '世界海鲜': { duration: '30 分钟', difficulty: '进阶', ingredients: [[dish.name, '1 份'], ['海鲜主料', '500g'], ['香料或咖喱', '适量'], ['椰奶或高汤', '适量'], ['蔬菜配料', '适量']], steps: ['海鲜处理干净，蔬菜切成大小一致的块。', '锅中炒香香料或咖喱基底。', '加入椰奶或高汤煮开，调好基础味道。', '先下耐煮配料，再放海鲜主料煮熟。', '收至汤汁略浓，配米饭或面包食用。'] }
    , '世界鸡肉': { duration: '35 分钟', difficulty: '进阶', ingredients: [[dish.name, '1 份'], ['鸡肉', '500g'], ['洋葱蒜', '适量'], ['风味香料', '适量'], ['高汤或椰奶', '适量']], steps: ['鸡肉切块擦干，用盐和少许香料抓匀。', '锅中将鸡肉煎至表面金黄，盛出备用。', '原锅炒香洋葱、蒜和风味香料。', '倒回鸡肉，加高汤或椰奶，小火焖熟。', '收浓酱汁，搭配米饭或饼类食用。'] }
    , '世界牛肉': { duration: '40 分钟', difficulty: '进阶', ingredients: [[dish.name, '1 份'], ['牛肉', '500g'], ['洋葱', '1 个'], ['风味香料', '适量'], ['高汤', '适量']], steps: ['牛肉逆纹切块或薄片，用盐和胡椒腌 10 分钟。', '锅烧热后分批煎牛肉，避免出水。', '炒香洋葱和香料，倒入高汤煮开。', '按牛肉部位焖煮至软嫩或快速收汁。', '尝味后配主食装盘。'] }
    , '西餐': { duration: '35 分钟', difficulty: '进阶', ingredients: [[dish.name, '1 份'], ['主食材', '适量'], ['黄油或橄榄油', '适量'], ['香草', '适量'], ['盐和黑胡椒', '适量']], steps: ['主食材擦干，用盐和黑胡椒提前调味。', '平底锅预热后加油或黄油，煎至两面上色。', '放入香草和配菜，按熟度继续加热。', '必要时加少许高汤或奶油形成酱汁。', '静置 2 分钟后切配装盘。'] }
    , '日料': { duration: '25 分钟', difficulty: '家常', ingredients: [[dish.name, '1 份'], ['主食材', '适量'], ['米饭或高汤', '适量'], ['酱油', '适量'], ['味醂或糖', '少许']], steps: ['准备主食材，保持切块大小一致。', '将酱油、味醂和少许糖调成日式酱汁。', '按菜品需要煎、煮或焯熟主食材。', '加入酱汁小火收至挂汁。', '搭配米饭或高汤，点缀葱花和芝麻。'] }
    , '环球风味': { duration: '35 分钟', difficulty: '进阶', ingredients: [[dish.name, '1 份'], ['主食材', '适量'], ['风味香料', '适量'], ['洋葱和蒜', '适量'], ['高汤或椰奶', '适量']], steps: ['将主食材切配好，香料提前称量。', '锅中炒香洋葱、蒜和风味香料。', '放入主食材翻炒，令表面均匀裹上香料。', '加入高汤或椰奶，小火焖至入味。', '调整盐度和酸度，搭配主食盛出。'] }
    , '主食': { duration: '30 分钟', difficulty: '家常', ingredients: [[dish.name, '1 份'], ['米饭或谷物', '2 人份'], ['蛋白质食材', '适量'], ['蔬菜', '适量'], ['调味料', '适量']], steps: ['准备隔夜饭或煮好的谷物，食材切成小丁。', '热锅后先炒香蛋白质食材并盛出。', '炒香蔬菜后加入米饭或谷物，压散炒匀。', '倒入调味料和主食材，大火翻炒。', '米粒干爽、香气出来后即可装盘。'] }
    , '早餐': { duration: '15 分钟', difficulty: '入门', ingredients: [[dish.name, '1 份'], ['鸡蛋或乳制品', '适量'], ['面包或谷物', '适量'], ['水果或蔬菜', '适量'], ['盐和胡椒', '少许']], steps: ['将食材洗净切配，提前预热锅具或烤箱。', '先处理需要较久加热的面包或谷物。', '用中小火制作鸡蛋或主蛋白。', '组合水果、蔬菜和酱料，调整口味。', '将热食与冷配菜一起装盘。'] }
    , '轻食': { duration: '18 分钟', difficulty: '入门', ingredients: [[dish.name, '1 份'], ['蔬菜', '适量'], ['蛋白质食材', '适量'], ['主食', '少量'], ['沙拉汁', '适量']], steps: ['蔬菜洗净彻底沥干，切成入口大小。', '将鸡肉、鱼肉或豆腐煎熟并稍微放凉。', '调制沙拉汁，先尝味道再倒入。', '将食材分层摆入碗或卷饼中。', '最后淋汁，轻轻拌匀即可。'] }
    , '素食轻食': { duration: '18 分钟', difficulty: '入门', ingredients: [[dish.name, '1 份'], ['新鲜蔬菜', '适量'], ['豆腐或豆类', '适量'], ['坚果或谷物', '少量'], ['橄榄油和醋', '适量']], steps: ['蔬菜洗净并充分沥干，根茎类切薄片。', '豆腐或豆类加少许盐煎香或焯熟。', '用橄榄油、醋和少许盐调出清爽酱汁。', '将蔬菜、蛋白和谷物分层摆盘。', '食用前再淋酱，轻拌即可。'] }
    , '甜品饮品': { duration: '20 分钟', difficulty: '入门', ingredients: [[dish.name, '1 份'], ['主原料', '适量'], ['牛奶或奶油', '适量'], ['糖', '适量'], ['水果或配料', '适量']], steps: ['准备主原料，冷藏食材提前回温或按需预冷。', '将液体和糖用小火搅拌至完全融合。', '加入主原料，持续搅拌至质地均匀。', '分装后放凉或冷藏至喜欢的口感。', '最后加入水果、珍珠或其他配料。'] }
  };
  const profile = profiles[category] || { duration: '30 分钟', difficulty: '家常', ingredients: [[dish.name, '1 份'], ['主食材', '适量'], ['葱姜蒜', '适量'], ['盐和基础调味', '适量']], steps: ['将食材洗净，按入口大小切配。', '热锅后下油，先将主食材煎或炒至变色。', '加入葱姜蒜和调味料，翻炒均匀。', '根据食材状态加少量热水，焖至熟透。', '开盖收汁，尝味后盛盘。'] };
  return { ...profile, tip: `这是 ${category} 的基础做法，可按家里口味调整咸淡和火候。`, source: 'basic' };
}

function recipeForDish(dish) {
  const recipe = RECIPE_LIBRARY[dish.name] || fallbackRecipe(dish);
  return { dish_id: dish.id, dish_name: dish.name, category: dish.category, ...recipe, source: RECIPE_LIBRARY[dish.name] ? 'curated' : recipe.source };
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

// ---------- 共享记事本 API ----------
function parseMentionIds(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map(positiveInt).filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function serializeSharedNote(row) {
  const mentionIds = parseMentionIds(row.mention_user_ids);
  const mentions = mentionIds.length
    ? db.prepare(`SELECT id, name, avatar, color FROM users WHERE id IN (${mentionIds.map(() => '?').join(',')}) ORDER BY id`).all(...mentionIds)
    : [];
  return { ...row, mention_user_ids: mentionIds, mentions };
}

app.get('/api/shared-notes', (req, res) => {
  const date = isDate(req.query.date) ? req.query.date : todayStr();
  const rows = db.prepare(
    `SELECT n.*, u.name AS author_name, u.avatar AS author_avatar, u.color AS author_color
     FROM shared_notes n JOIN users u ON u.id = n.author_id
     WHERE n.note_date = ? ORDER BY n.id DESC`
  ).all(date);
  res.json({ date, notes: rows.map(serializeSharedNote) });
});

app.post('/api/shared-notes', (req, res) => {
  const authorId = positiveInt(req.body.author_id);
  const noteDate = req.body.note_date;
  const content = typeof req.body.content === 'string' ? req.body.content.trim().slice(0, 1000) : '';
  const mentionIds = Array.isArray(req.body.mention_user_ids)
    ? [...new Set(req.body.mention_user_ids.map(positiveInt).filter(Boolean))].slice(0, 12)
    : [];
  if (!authorId || !isDate(noteDate) || !content) return res.status(400).json({ error: '请填写日期、记录人和内容' });
  const author = db.prepare('SELECT id, name, avatar, color FROM users WHERE id = ?').get(authorId);
  if (!author) return res.status(404).json({ error: '记录人不存在' });
  const validMentionIds = mentionIds.filter(id => id !== authorId && db.prepare('SELECT 1 FROM users WHERE id = ?').get(id));
  const info = db.prepare(
    'INSERT INTO shared_notes (note_date, content, author_id, mention_user_ids) VALUES (?, ?, ?, ?)'
  ).run(noteDate, content, authorId, JSON.stringify(validMentionIds));
  const row = db.prepare(
    `SELECT n.*, u.name AS author_name, u.avatar AS author_avatar, u.color AS author_color
     FROM shared_notes n JOIN users u ON u.id = n.author_id WHERE n.id = ?`
  ).get(info.lastInsertRowid);
  const note = serializeSharedNote(row);
  broadcast({ type: 'shared_note', note });
  if (note.mentions.length) {
    pushNotification({
      user_id: author.id,
      user_name: author.name,
      dish_name: '共享记事本',
      meal: null,
      type: 'shared_note',
      message: `${author.name} 在共享记事本中提醒了 ${note.mentions.map(user => user.name).join('、')}。`
    });
  }
  res.status(201).json(note);
});

app.delete('/api/shared-notes/:id', (req, res) => {
  const noteId = positiveInt(req.params.id);
  const authorId = positiveInt(req.query.author_id);
  if (!noteId || !authorId) return res.status(400).json({ error: '参数无效' });
  const note = db.prepare('SELECT id, author_id, note_date FROM shared_notes WHERE id = ?').get(noteId);
  if (!note) return res.status(404).json({ error: '记录不存在' });
  if (note.author_id !== authorId) return res.status(403).json({ error: '只能删除自己发布的记录' });
  db.prepare('DELETE FROM shared_notes WHERE id = ?').run(noteId);
  broadcast({ type: 'shared_note_deleted', id: noteId, note_date: note.note_date });
  res.json({ ok: true });
});

// ---------- 宠物清单 API ----------
const PET_CARE_TYPES = new Set(['vaccine', 'internal_deworming', 'external_deworming', 'bath', 'nail_trim', 'health_check', 'vet_visit', 'weight']);
const RECOMMENDATION_KINDS = new Set(['place', 'merchant', 'product']);

function optionalCoordinate(value, min, max) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
}

function recommendationLocation(body) {
  const latitude = optionalCoordinate(body.latitude, -90, 90);
  const longitude = optionalCoordinate(body.longitude, -180, 180);
  if (latitude === undefined || longitude === undefined || (latitude == null) !== (longitude == null)) return null;
  return { latitude, longitude };
}

function recommendationRecord(id) {
  const record = db.prepare(
    `SELECT r.*, u.name AS author_name, u.avatar AS author_avatar,
            (SELECT COUNT(*) FROM recommendation_checkins c WHERE c.recommendation_id = r.id) AS checkin_count,
            (SELECT MAX(c.checkin_date) FROM recommendation_checkins c WHERE c.recommendation_id = r.id) AS last_checkin_date
     FROM recommendations r LEFT JOIN users u ON u.id = r.created_by WHERE r.id = ?`
  ).get(id);
  if (record) record.images = db.prepare('SELECT image_path, caption, sort_order FROM recommendation_images WHERE recommendation_id = ? ORDER BY sort_order, id').all(id);
  return record;
}

app.get('/api/family-recommendations', (req, res) => {
  const kind = typeof req.query.kind === 'string' ? req.query.kind : '';
  if (kind && !RECOMMENDATION_KINDS.has(kind)) return res.status(400).json({ error: '推荐分类无效' });
  const query = `SELECT r.*, u.name AS author_name, u.avatar AS author_avatar,
    (SELECT COUNT(*) FROM recommendation_checkins c WHERE c.recommendation_id = r.id) AS checkin_count,
    (SELECT MAX(c.checkin_date) FROM recommendation_checkins c WHERE c.recommendation_id = r.id) AS last_checkin_date
    FROM recommendations r LEFT JOIN users u ON u.id = r.created_by${kind ? ' WHERE r.kind = ?' : ''} ORDER BY CASE WHEN r.travel_key <> '' THEN 0 ELSE 1 END, r.id`;
  const list = db.prepare(query).all(...(kind ? [kind] : []));
  const images = db.prepare('SELECT recommendation_id, image_path, caption, sort_order FROM recommendation_images ORDER BY sort_order, id').all();
  const byRecommendation = images.reduce((all, image) => ((all[image.recommendation_id] ||= []).push(image), all), {});
  res.json(list.map(record => ({ ...record, images: byRecommendation[record.id] || [] })));
});

app.post('/api/family-recommendations', (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim().slice(0, 80) : '';
  const kind = typeof req.body.kind === 'string' ? req.body.kind : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim().slice(0, 500) : '';
  const region = typeof req.body.region === 'string' ? req.body.region.trim().slice(0, 80) : '';
  const address = typeof req.body.address === 'string' ? req.body.address.trim().slice(0, 160) : '';
  const createdBy = req.body.created_by == null || req.body.created_by === '' ? null : positiveInt(req.body.created_by);
  const location = recommendationLocation(req.body);
  if (!title || !RECOMMENDATION_KINDS.has(kind) || !location) return res.status(400).json({ error: '请填写名称、分类，并检查坐标是否完整' });
  if (createdBy && !db.prepare('SELECT 1 FROM users WHERE id = ?').get(createdBy)) return res.status(404).json({ error: '记录人不存在' });
  const info = db.prepare(
    'INSERT INTO recommendations (title, kind, description, region, address, latitude, longitude, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(title, kind, description, region, address, location.latitude, location.longitude, createdBy);
  const record = recommendationRecord(info.lastInsertRowid);
  broadcast({ type: 'recommendation', record });
  res.status(201).json(record);
});

app.get('/api/family-checkins', (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
  const rows = db.prepare(
    `SELECT c.*, r.title AS recommendation_title, r.kind AS recommendation_kind,
            u.name AS author_name, u.avatar AS author_avatar
     FROM recommendation_checkins c LEFT JOIN recommendations r ON r.id = c.recommendation_id
     LEFT JOIN users u ON u.id = c.created_by ORDER BY c.checkin_date DESC, c.id DESC LIMIT ?`
  ).all(limit);
  res.json(rows);
});

app.post('/api/family-checkins', (req, res) => {
  const recommendationId = req.body.recommendation_id == null || req.body.recommendation_id === '' ? null : positiveInt(req.body.recommendation_id);
  const checkinDate = req.body.checkin_date;
  const region = typeof req.body.region === 'string' ? req.body.region.trim().slice(0, 80) : '';
  const address = typeof req.body.address === 'string' ? req.body.address.trim().slice(0, 160) : '';
  const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
  const createdBy = req.body.created_by == null || req.body.created_by === '' ? null : positiveInt(req.body.created_by);
  const location = recommendationLocation(req.body);
  if (!isDate(checkinDate) || !region || !location) return res.status(400).json({ error: '请选择日期，填写打卡地区，并检查坐标是否完整' });
  if (recommendationId && !db.prepare('SELECT 1 FROM recommendations WHERE id = ?').get(recommendationId)) return res.status(404).json({ error: '推荐项目不存在' });
  if (createdBy && !db.prepare('SELECT 1 FROM users WHERE id = ?').get(createdBy)) return res.status(404).json({ error: '记录人不存在' });
  const info = db.prepare(
    'INSERT INTO recommendation_checkins (recommendation_id, checkin_date, region, address, latitude, longitude, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(recommendationId, checkinDate, region, address, location.latitude, location.longitude, note, createdBy);
  const record = db.prepare(
    `SELECT c.*, r.title AS recommendation_title, r.kind AS recommendation_kind,
            u.name AS author_name, u.avatar AS author_avatar
     FROM recommendation_checkins c LEFT JOIN recommendations r ON r.id = c.recommendation_id
     LEFT JOIN users u ON u.id = c.created_by WHERE c.id = ?`
  ).get(info.lastInsertRowid);
  broadcast({ type: 'recommendation_checkin', record });
  res.status(201).json(record);
});

app.get('/api/pets', (req, res) => {
  const pets = db.prepare('SELECT * FROM pets ORDER BY id').all();
  const latestRows = db.prepare(
    `SELECT r.pet_id, r.care_type, r.care_date, r.note
     FROM pet_care_records r
     WHERE NOT EXISTS (
       SELECT 1 FROM pet_care_records newer
       WHERE newer.pet_id = r.pet_id AND newer.care_type = r.care_type
         AND (newer.care_date > r.care_date OR (newer.care_date = r.care_date AND newer.id > r.id))
     )
     ORDER BY r.pet_id, r.care_type`
  ).all();
  const latest = latestRows.reduce((all, row) => ((all[row.pet_id] ||= {})[row.care_type] = row, all), {});
  res.json(pets.map(pet => ({ ...pet, latest: latest[pet.id] || {} })));
});

app.get('/api/pet-care-records', (req, res) => {
  const petId = req.query.pet_id == null ? null : positiveInt(req.query.pet_id);
  if (req.query.pet_id != null && !petId) return res.status(400).json({ error: '宠物编号无效' });
  const limit = Math.min(300, Math.max(1, Number(req.query.limit) || 120));
  const rows = petId
    ? db.prepare(
      `SELECT r.*, p.name AS pet_name, p.avatar AS pet_avatar, p.gender AS pet_gender, p.color AS pet_color,
              u.name AS author_name, u.avatar AS author_avatar
       FROM pet_care_records r JOIN pets p ON p.id = r.pet_id
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.pet_id = ? ORDER BY r.care_date DESC, r.id DESC LIMIT ?`
    ).all(petId, limit)
    : db.prepare(
      `SELECT r.*, p.name AS pet_name, p.avatar AS pet_avatar, p.gender AS pet_gender, p.color AS pet_color,
              u.name AS author_name, u.avatar AS author_avatar
       FROM pet_care_records r JOIN pets p ON p.id = r.pet_id
       LEFT JOIN users u ON u.id = r.created_by
       ORDER BY r.care_date DESC, r.id DESC LIMIT ?`
    ).all(limit);
  res.json(rows);
});

app.post('/api/pet-care-records', (req, res) => {
  const petId = positiveInt(req.body.pet_id);
  const createdBy = req.body.created_by == null || req.body.created_by === '' ? null : positiveInt(req.body.created_by);
  const careType = typeof req.body.care_type === 'string' ? req.body.care_type : '';
  const careDate = req.body.care_date;
  const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
  if (!petId || !PET_CARE_TYPES.has(careType) || !isDate(careDate)) return res.status(400).json({ error: '请选择猫咪、护理项目和日期' });
  const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId);
  if (!pet) return res.status(404).json({ error: '猫咪不存在' });
  if (createdBy && !db.prepare('SELECT 1 FROM users WHERE id = ?').get(createdBy)) return res.status(404).json({ error: '记录人不存在' });
  const info = db.prepare(
    'INSERT INTO pet_care_records (pet_id, care_type, care_date, note, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(petId, careType, careDate, note, createdBy);
  const record = db.prepare(
    `SELECT r.*, p.name AS pet_name, p.avatar AS pet_avatar, p.color AS pet_color,
            u.name AS author_name, u.avatar AS author_avatar
     FROM pet_care_records r JOIN pets p ON p.id = r.pet_id
     LEFT JOIN users u ON u.id = r.created_by WHERE r.id = ?`
  ).get(info.lastInsertRowid);
  broadcast({ type: 'pet_care_record', record });
  res.status(201).json(record);
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

app.get('/api/dishes/:id/recipe', (req, res) => {
  const dishId = positiveInt(req.params.id);
  if (!dishId) return res.status(400).json({ error: '菜品编号无效' });
  const dish = db.prepare('SELECT id, name, category FROM dishes WHERE id = ?').get(dishId);
  if (!dish) return res.status(404).json({ error: '菜品不存在' });
  res.json(recipeForDish(dish));
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
    `SELECT s.user_id, s.meal, s.date, s.note, d.id AS dish_id, d.name AS dish_name, d.image,
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

app.get('/api/recent-selection', (req, res) => {
  const { user_id, meal, date } = req.query;
  const userId = positiveInt(user_id);
  if (!userId || !isMeal(meal) || !isDate(date)) return res.json(null);
  const row = db.prepare(
    `SELECT s.*, d.name AS dish_name, d.image, d.category
     FROM selections s JOIN dishes d ON s.dish_id = d.id
     WHERE s.user_id = ? AND s.meal = ? AND s.date < ? ORDER BY s.date DESC, s.created_at DESC LIMIT 1`
  ).get(userId, meal, date);
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

app.post('/api/select/note', (req, res) => {
  const userId = positiveInt(req.body.user_id);
  const { meal, date } = req.body;
  const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 80) : '';
  if (!userId || !isMeal(meal) || !isDate(date)) return res.status(400).json({ error: '参数无效' });
  const selection = db.prepare('SELECT id FROM selections WHERE user_id = ? AND meal = ? AND date = ?').get(userId, meal, date);
  if (!selection) return res.status(404).json({ error: '请先选择一道菜' });
  db.prepare('UPDATE selections SET note = ? WHERE id = ?').run(note, selection.id);
  broadcast({ type: 'selection_note', user_id: userId, meal, date, note });
  res.json({ ok: true, note });
});

app.delete('/api/select', (req, res) => {
  const userId = positiveInt(req.query.user_id);
  const { meal, date } = req.query;
  if (!userId || !isMeal(meal) || !isDate(date)) return res.status(400).json({ error: '参数无效' });
  const selection = db.prepare('SELECT * FROM selections WHERE user_id = ? AND meal = ? AND date = ?').get(userId, meal, date);
  if (!selection) return res.json({ ok: true, changed: false });
  db.prepare('DELETE FROM selections WHERE id = ?').run(selection.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  pushNotification({ user_id: userId, user_name: user?.name || '家人', meal, type: 'undo', message: `${user?.name || '家人'}撤回了${meal === 'lunch' ? '中饭' : '晚饭'}的选择。` });
  res.json({ ok: true, changed: true });
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

app.get('/api/stats', (req, res) => {
  const totals = {
    dishes: db.prepare('SELECT COUNT(*) AS count FROM dishes').get().count,
    selections: db.prepare('SELECT COUNT(*) AS count FROM selections').get().count,
    users: db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  };
  const top = db.prepare(
    `SELECT d.name, d.image, d.category, COUNT(*) AS times
     FROM selections s JOIN dishes d ON s.dish_id = d.id
     GROUP BY s.dish_id ORDER BY times DESC, d.name LIMIT 5`
  ).all();
  const recentCount = db.prepare("SELECT COUNT(*) AS count FROM selections WHERE date >= date('now', '-6 days')").get().count;
  res.json({ totals, top, recentCount });
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
