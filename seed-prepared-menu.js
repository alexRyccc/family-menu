const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'data', 'family.db'));
const uploads = path.join(__dirname, 'uploads');
const dishes = [
  ['奶油鸡', '环球风味', '番茄奶油酱浓郁暖胃', 'Chicken Handi'], ['泰式绿咖喱鸡', '环球风味', '椰香清新，微辣开胃', 'thai green curry'],
  ['印度烤鸡', '环球风味', '香料烤制，外焦里嫩', 'tandoori chicken'], ['西班牙海鲜饭', '环球风味', '藏红花米饭配鲜美海鲜', 'paella'],
  ['墨西哥鸡肉卷', '环球风味', '鸡肉蔬菜卷，酸辣爽口', 'chicken fajita'], ['牛肉汉堡', '环球风味', '厚实肉饼，芝士融化刚好', 'big mac'],
  ['焗烤通心粉', '环球风味', '奶酪焗烤，软糯满足', 'mac and cheese'], ['牧羊人派', '环球风味', '土豆泥盖住香浓肉酱', 'shepherds pie'],
  ['英式早餐', '早餐', '煎蛋香肠和烤豆，一盘吃饱', 'full english breakfast'], ['法式洋葱汤', '汤羹', '焦糖洋葱配芝士面包', 'french onion soup'],
  ['越南牛肉粉', '面食', '清亮牛骨汤，米粉顺滑', 'pho'], ['泰式炒河粉', '面食', '酸甜咸香，花生碎增香', 'pad thai'],
  ['印尼炒饭', '主食', '香料炒饭，配煎蛋更满足', 'Nasi lemak'], ['日式咖喱饭', '主食', '浓稠咖喱，土豆胡萝卜软糯', 'Katsu Chicken curry'],
  ['鸡肉库斯库斯', '主食', '颗粒松软，鸡肉和蔬菜搭配均衡', 'Chicken Couscous'], ['希腊沙拉', '轻食', '番茄黄瓜和菲达奶酪清爽搭配', 'greek salad'],
  ['烤三文鱼', '海鲜', '表皮微脆，鱼肉细嫩', 'salmon'], ['蒜香柠檬虾', '海鲜', '柠檬提鲜，蒜香扑鼻', 'Garides Saganaki'],
  ['椰香海鲜汤', '汤羹', '椰奶汤底，鲜香微辣', 'tom yum'], ['泰式蟹肉咖喱', '环球风味', '蟹肉鲜甜，咖喱浓香', 'Massaman Beef'],
  ['土耳其烤肉卷', '环球风味', '烤肉搭配蔬菜，香气十足', 'kebab'], ['意式烩饭', '主食', '奶油米饭，口感绵密', 'risotto'],
  ['火腿奶酪可颂', '早餐', '酥脆可颂夹入咸香火腿', 'croissant'], ['香蕉松饼', '早餐', '松软香甜，适合轻松早晨', 'pancakes'],
  ['鸡肉凯撒卷', '轻食', '烤鸡肉和生菜卷起，方便轻盈', 'Chicken Fajita Mac and Cheese'], ['金枪鱼三明治', '轻食', '金枪鱼拌酱，简单好吃', 'Tuna Nicoise'],
  ['蓝莓芝士蛋糕', '甜品饮品', '芝士绵密，莓果清爽', 'New York cheesecake'], ['苹果杏仁塔', '甜品饮品', '苹果柔软，杏仁香气浓郁', 'Apple Frangipan Tart'],
  ['巧克力布朗尼', '甜品饮品', '浓郁巧克力，外脆内软', 'Chocolate Gateau'], ['太妃布丁', '甜品饮品', '焦糖太妃酱，温暖甜香', 'Sticky Toffee Pudding']
];

async function imageFor(query, target) {
  const result = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
  const meal = (await result.json()).meals?.[0];
  if (!meal?.strMealThumb) throw new Error('no image');
  const image = await fetch(meal.strMealThumb);
  if (!image.ok) throw new Error('image download failed');
  fs.writeFileSync(target, Buffer.from(await image.arrayBuffer()));
}

(async () => {
  fs.mkdirSync(uploads, { recursive: true });
  const insert = db.prepare('INSERT INTO dishes (name, description, image, category) VALUES (?, ?, ?, ?)');
  let added = 0;
  for (const [index, [name, category, description, query]] of dishes.entries()) {
    if (db.prepare('SELECT 1 FROM dishes WHERE name = ?').get(name)) continue;
    const basename = `prepared-${String(index + 1).padStart(3, '0')}`;
    const jpgFile = `${basename}.jpg`;
    const webpFile = `${basename}.webp`;
    try {
      const jpgTarget = path.join(uploads, jpgFile);
      const webpTarget = path.join(uploads, webpFile);
      if (!fs.existsSync(jpgTarget) && !fs.existsSync(webpTarget)) await imageFor(query, jpgTarget);
      insert.run(name, description, `/uploads/${fs.existsSync(webpTarget) ? webpFile : jpgFile}`, category);
      added += 1;
      console.log(`added: ${name}`);
    } catch (error) { console.warn(`skipped ${name}: ${error.message}`); }
  }
  console.log(`added ${added}, total ${db.prepare('SELECT COUNT(*) AS count FROM dishes').get().count}`);
  db.close();
})().catch(error => { console.error(error); db.close(); process.exit(1); });
