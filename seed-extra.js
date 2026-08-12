// seed-extra.js — 额外 40 道菜,运行 node seed.js 后执行
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'family.db'));

const existing = db.prepare('SELECT COUNT(*) as c FROM dishes').get();
console.log('当前菜品数:', existing.c);

if (existing.c >= 80) {
  console.log('已有 80+ 道菜,无需执行');
  db.close();
  process.exit(0);
}

const dishes = [
  { name: '糖醋里脊', cat: '家常菜', desc: '外酥里嫩,酸甜可口', img: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=400&fit=crop' },
  { name: '可乐鸡翅', cat: '家常菜', desc: '甜嫩多汁,老少皆宜', img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&h=400&fit=crop' },
  { name: '蒜香排骨', cat: '家常菜', desc: '蒜香四溢,外焦里嫩', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop' },
  { name: '红烧鱼', cat: '家常菜', desc: '鲜嫩入味,酱香浓郁', img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop' },
  { name: '清蒸鲈鱼', cat: '家常菜', desc: '清淡鲜美,原汁原味', img: 'https://images.unsplash.com/photo-1535140728325-a4d3707eee94?w=600&h=400&fit=crop' },
  { name: '辣子鸡', cat: '家常菜', desc: '麻辣鲜香,鸡肉嫩滑', img: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&h=400&fit=crop' },
  { name: '口水鸡', cat: '家常菜', desc: '麻辣鲜香,开胃凉菜', img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&h=400&fit=crop' },
  { name: '夫妻肺片', cat: '家常菜', desc: '麻辣爽口,牛肉薄片', img: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&h=400&fit=crop' },
  { name: '麻辣火锅', cat: '火锅', desc: '红油翻滚,麻辣过瘾', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop' },
  { name: '番茄火锅', cat: '火锅', desc: '酸甜开胃,汤底浓郁', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop' },
  { name: '羊肉涮锅', cat: '火锅', desc: '鲜嫩羊肉,一涮即食', img: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&h=400&fit=crop' },
  { name: '菌菇火锅', cat: '火锅', desc: '鲜美菌菇,养生滋补', img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=400&fit=crop' },
  { name: '鸳鸯火锅', cat: '火锅', desc: '一锅两味,满足不同口味', img: 'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=600&h=400&fit=crop' },
  { name: '牛排', cat: '西餐', desc: '外焦里嫩,肉汁丰富', img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop' },
  { name: '意大利面', cat: '西餐', desc: '番茄罗勒,经典意式', img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&h=400&fit=crop' },
  { name: '披萨', cat: '西餐', desc: '芝士拉丝,香气四溢', img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop' },
  { name: '凯撒沙拉', cat: '西餐', desc: '新鲜蔬菜,经典酱汁', img: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&h=400&fit=crop' },
  { name: '寿司拼盘', cat: '日料', desc: '新鲜刺身,精致摆盘', img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop' },
  { name: '日式拉面', cat: '日料', desc: '浓郁汤底,叉烧溏心蛋', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop' },
  { name: '天妇罗', cat: '日料', desc: '酥脆轻薄,食材本味', img: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&h=400&fit=crop' },
  { name: '鳗鱼饭', cat: '日料', desc: '酱汁浓郁,鳗鱼软糯', img: 'https://images.unsplash.com/photo-1580442151529-343f2f6e0e27?w=600&h=400&fit=crop' },
  { name: '炸酱面', cat: '面食', desc: '酱香浓郁,配菜丰富', img: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&h=400&fit=crop' },
  { name: '兰州拉面', cat: '面食', desc: '一清二白三红四绿', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop' },
  { name: '担担面', cat: '面食', desc: '麻辣鲜香,花生碎增香', img: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&h=400&fit=crop' },
  { name: '小笼包', cat: '面食', desc: '皮薄馅大,汤汁鲜美', img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&h=400&fit=crop' },
  { name: '紫菜蛋花汤', cat: '汤羹', desc: '清淡鲜美,营养丰富', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop' },
  { name: '冬瓜排骨汤', cat: '汤羹', desc: '清热解暑,滋补养身', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop' },
  { name: '银耳莲子羹', cat: '汤羹', desc: '润肺养颜,清甜滋润', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop' },
  { name: '鸡汤', cat: '汤羹', desc: '金黄醇厚,滋补暖身', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop' },
  { name: '芒果布丁', cat: '甜品饮品', desc: '香甜滑嫩,果香浓郁', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop' },
  { name: '红豆沙', cat: '甜品饮品', desc: '绵密香甜,传统甜品', img: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=400&fit=crop' },
  { name: '珍珠奶茶', cat: '甜品饮品', desc: 'Q弹珍珠,香浓奶茶', img: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&h=400&fit=crop' },
  { name: '双皮奶', cat: '甜品饮品', desc: '奶香浓郁,口感细腻', img: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=400&fit=crop' },
  { name: '杨枝甘露', cat: '甜品饮品', desc: '芒果椰汁,清新爽口', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop' },
];

let added = 0;
const insert = db.prepare('INSERT INTO dishes (name, description, image, category) VALUES (?, ?, ?, ?)');
for (const d of dishes) {
  const dup = db.prepare('SELECT id FROM dishes WHERE name = ?').get(d.name);
  if (dup) { console.log('跳过重复:', d.name); continue; }
  insert.run(d.name, d.desc, d.img, d.cat);
  added++;
  console.log('添加:', d.name, '-', d.cat);
}

console.log('\\n完成! 新增', added, '道菜');
console.log('当前总菜品数:', db.prepare('SELECT COUNT(*) as c FROM dishes').get().c);
db.close();
