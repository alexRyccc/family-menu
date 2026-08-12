const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'family.db');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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
`);

// 猫猫家族人物
const FAMILY = [
  ['猫妈妈', '😻', '#ff8fab'],
  ['猫爸爸', '😸', '#5b8def'],
  ['小猫', '🐱', '#ff9f43'],
  ['猫爷爷', '😺', '#a67c52'],
  ['猫奶奶', '😽', '#9b59b6'],
  ['猫姐姐', '😼', '#4caf7d'],
];

// 40 道菜: [菜名, 分类, 描述]
const DISHES = [
  // 家常菜 (10)
  ['红烧肉', '家常菜', '肥而不腻,入口即化,经典家常硬菜'],
  ['番茄炒蛋', '家常菜', '酸甜可口,米饭绝配'],
  ['麻婆豆腐', '家常菜', '麻辣鲜香,下饭神器'],
  ['可乐鸡翅', '家常菜', '甜咸入味,小朋友的最爱'],
  ['糖醋排骨', '家常菜', '外酥里嫩,酸甜开胃'],
  ['青椒肉丝', '家常菜', '清脆爽口,简单下饭'],
  ['宫保鸡丁', '家常菜', '香辣酥脆,花生米点睛之笔'],
  ['鱼香肉丝', '家常菜', '咸甜酸辣兼备,川菜经典'],
  ['回锅肉', '家常菜', '肥而不腻,蒜苗增香'],
  ['清蒸鲈鱼', '家常菜', '鲜嫩爽滑,营养美味'],
  // 火锅 (5)
  ['麻辣火锅', '火锅', '红汤翻滚,麻辣过瘾'],
  ['番茄火锅', '火锅', '酸甜浓郁,涮菜绝配'],
  ['菌汤火锅', '火锅', '鲜美养生,汤底都能喝'],
  ['鸳鸯火锅', '火锅', '一半麻辣一半清汤,各取所需'],
  ['清汤火锅', '火锅', '清淡鲜美,还原食材本味'],
  // 西餐 (6)
  ['黑椒牛排', '西餐', '多汁鲜嫩,黑椒香气扑鼻'],
  ['意大利肉酱面', '西餐', '浓郁肉酱裹满意面,经典风味'],
  ['玛格丽特披萨', '西餐', '罗勒+番茄+芝士,意式经典'],
  ['奶油蘑菇汤', '西餐', '香浓顺滑,暖心暖胃'],
  ['凯撒沙拉', '西餐', '清爽蔬菜配香脆面包丁'],
  ['炸鸡薯条', '西餐', '金黄酥脆,快乐源泉'],
  // 日料 (6)
  ['三文鱼刺身', '日料', '新鲜肥美,入口即化'],
  ['寿司拼盘', '日料', '现握寿司,米饭与鱼生的完美结合'],
  ['豚骨拉面', '日料', '浓郁骨汤,溏心蛋点睛'],
  ['天妇罗', '日料', '外脆里嫩,蘸汁更香'],
  ['鳗鱼饭', '日料', '蒲烧鳗鱼,酱香浓郁'],
  ['味噌汤', '日料', '暖胃清汤,日料标配'],
  // 面食 (5)
  ['兰州拉面', '面食', '一清二白三红四绿,牛肉汤面'],
  ['炸酱面', '面食', '老北京风味,酱香浓郁'],
  ['阳春面', '面食', '清清淡淡,一碗暖胃'],
  ['鲜肉馄饨', '面食', '皮薄馅大,汤鲜味美'],
  ['韭菜鸡蛋饺', '面食', '家常饺子,蘸醋更香'],
  // 汤羹 (4)
  ['冬瓜排骨汤', '汤羹', '清热解暑,汤清味鲜'],
  ['紫菜蛋花汤', '汤羹', '鲜香暖身,三分钟速成'],
  ['皮蛋瘦肉粥', '汤羹', '绵密顺滑,早餐首选'],
  ['玉米排骨汤', '汤羹', '清甜滋补,全家都爱'],
  // 甜品饮品 (4)
  ['杨枝甘露', '甜品饮品', '芒果西柚西米露,港式经典'],
  ['珍珠奶茶', '甜品饮品', 'Q弹珍珠,奶茶微甜'],
  ['双皮奶', '甜品饮品', '香滑细腻,奶香浓郁'],
  ['银耳莲子羹', '甜品饮品', '胶质满满,润肺养颜'],
];

// 图片映射 (由 fetch-images.js 生成)
let imageMap = [];
try {
  imageMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'dish-images.json'), 'utf8'));
} catch (e) { /* 无映射文件时全部走SVG占位 */ }

function makeSvg(name, emoji, c1, c2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="r" cx="0.5" cy="0.35" r="0.7">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="640" height="400" fill="url(#g)"/>
  <rect width="640" height="400" fill="url(#r)"/>
  <text x="320" y="210" font-size="150" text-anchor="middle">${emoji}</text>
  <text x="320" y="335" font-size="42" font-family="PingFang SC, Microsoft YaHei, sans-serif" text-anchor="middle" fill="rgba(255,255,255,0.95)" font-weight="bold">${name}</text>
</svg>`;
}

const EMOJI_FALLBACK = ['🥘', '🍅', '🌶️', '🍗', '🍖', '🫑', '🥜', '🥕', '🥓', '🐟', '🔥', '🍅', '🍄', '🥘', '🍲', '🥩', '🍝', '🍕', '🥣', '🥗', '🍟', '🍣', '🍣', '🍜', '🍤', '🍱', '🍲', '🍜', '🍝', '🍜', '🥟', '🥟', '🍲', '🌊', '🥣', '🌽', '🥭', '🧋', '🍮', '🍯'];
const SVG_COLORS = [
  ['#e0603f', '#b23a26'], ['#ff8f5c', '#e2622f'], ['#d64541', '#96281b'], ['#c98a4b', '#8a5a2b'],
  ['#e87a5d', '#b04a30'], ['#6fbf5a', '#3f8f2e'], ['#d98e32', '#a05e14'], ['#d4753f', '#93471f'],
  ['#b05c3a', '#6e351f'], ['#7fb8e8', '#4a7fc4'], ['#c0392b', '#7b241c'], ['#ff8f5c', '#d64541'],
  ['#8e6b4a', '#5c4028'], ['#a93226', '#5c4028'], ['#f0a35e', '#c77b3f'], ['#8e4a2f', '#57291a'],
  ['#d98e32', '#a05e14'], ['#e8a33d', '#b06f14'], ['#c9a26b', '#8a6a3c'], ['#7cb342', '#4a7c2a'],
  ['#d9a441', '#a06b14'], ['#f08a5d', '#c25b33'], ['#5f9ea0', '#2e6b6e'], ['#d9a441', '#a06b14'],
  ['#e8a33d', '#b06f14'], ['#b05c3a', '#6e351f'], ['#a8b56c', '#6c7a3c'], ['#d9a441', '#a06b14'],
  ['#8e4a2f', '#57291a'], ['#f0c469', '#b8912e'], ['#f0a35e', '#c77b3f'], ['#d98e32', '#a05e14'],
  ['#9ecf8a', '#5c9a4a'], ['#9a86c9', '#5f4f8f'], ['#d9c7a3', '#a08a5c'], ['#f2c14e', '#c08f1a'],
  ['#ffb347', '#e8862f'], ['#c98a6b', '#8a5a4a'], ['#f7d9c4', '#d9a08a'], ['#e8d5a8', '#b89a5c']
];

let addedUsers = 0;
for (const [name, avatar, color] of FAMILY) {
  const exists = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
  if (exists) continue;
  db.prepare('INSERT INTO users (name, avatar, color) VALUES (?, ?, ?)').run(name, avatar, color);
  addedUsers++;
}

let addedDishes = 0;
DISHES.forEach(([name, category, desc], i) => {
  const exists = db.prepare('SELECT id FROM dishes WHERE name = ?').get(name);
  if (exists) return;
  const generated = `menu-${String(i + 1).padStart(3, '0')}`;
  const imageFile = fs.readdirSync(UPLOAD_DIR).find(file => file.startsWith(generated) && file.endsWith('.webp'));
  const image = imageFile ? `/uploads/${imageFile}` : null;
  db.prepare('INSERT INTO dishes (name, description, image, category) VALUES (?, ?, ?, ?)')
    .run(name, desc, image, category);
  addedDishes++;
});

console.log(`✅ 示例数据就绪: 新增 ${addedDishes} 道菜, ${addedUsers} 位家庭成员`);
console.log(`   现有菜品总数: ${db.prepare('SELECT COUNT(*) AS c FROM dishes').get().c}`);
console.log(`   家庭成员总数: ${db.prepare('SELECT COUNT(*) AS c FROM users').get().c}`);
