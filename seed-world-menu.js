const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'data', 'family.db'));
const uploads = path.join(__dirname, 'uploads');
const dishes = [
  ['阿卡拉虾馅豆饼', '世界海鲜', '黑眼豆炸饼包入鲜虾，外脆内软', '53483'], ['柬式鱼肉咖喱', '世界海鲜', '椰香柔和的柬埔寨鱼咖喱', '53495'],
  ['西班牙海鲜烩饭', '世界海鲜', '鲜虾鱿鱼和米饭一锅焖香', '53147'], ['巴伊亚椰奶虾炖', '世界海鲜', '椰奶番茄炖出海鲜甜味', '53481'],
  ['茴香烤三文鱼', '世界海鲜', '番茄茴香配烤三文鱼', '52959'], ['海鲜番茄浓汤', '世界海鲜', '鱼肉与番茄慢炖，浓郁鲜美', '53440'],
  ['砰砰虾沙拉', '世界海鲜', '鲜虾配爽脆蔬菜，微辣开胃', '53239'], ['孟加拉萝卜鱼咖喱', '世界海鲜', '香料鱼咖喱搭配清甜白萝卜', '53451'],
  ['摩洛哥香料海鲈鱼', '世界海鲜', '烤鱼配温暖北非香料', '53103'], ['卡津鱼肉塔可', '世界海鲜', '辛香烤鱼放进玉米饼里', '52819'],
  ['哈罗米鸡肉汉堡', '世界鸡肉', '鸡肉和咸香奶酪的快速汉堡', '53085'], ['马来香烤鸡', '世界鸡肉', '椰香辣酱烤鸡，甜辣交织', '53050'],
  ['比利时奶油炖鸡', '世界鸡肉', '奶油蔬菜汤底温暖柔和', '53466'], ['孟加拉土豆鸡咖喱', '世界鸡肉', '香料鸡肉和软糯土豆', '53453'],
  ['牙买加棕炖鸡', '世界鸡肉', '焦糖酱汁慢炖鸡肉，咸甜浓郁', '52940'], ['美式鸡肉三明治', '世界鸡肉', '脆鸡排夹入松软面包', '53016'],
  ['西班牙香肠鸡肉焖饭', '世界鸡肉', '鸡肉香肠和米饭一起焖熟', '53161'], ['鸡肉蘑菇火锅', '世界鸡肉', '鸡肉蘑菇热锅，暖胃简单', '52846'],
  ['奶油鸡肉意面', '世界鸡肉', '奶油酱包裹鸡肉与彩蔬', '52796'], ['鸡肉土豆薄饼', '世界鸡肉', '香料鸡肉土豆包进柔软薄饼', '53459'],
  ['阿尔及利亚牛肉丸', '世界牛肉', '香料牛肉丸，肉香扎实', '53281'], ['委内瑞拉手撕牛肉玉米饼', '世界牛肉', '玉米饼夹满丰盛牛肉', '53334'],
  ['牛肉奶酪玉米饼', '世界牛肉', '烤牛肉和奶酪的热乎组合', '53329'], ['南美炭烤牛肉', '世界牛肉', '大块牛肉炭烤，焦香四溢', '53133'],
  ['澳式牛肉汉堡', '世界牛肉', '厚肉饼加蔬菜，满足感十足', '53099'], ['巴巴多斯胡椒牛肉炖', '世界牛肉', '黑胡椒香气浓厚的慢炖牛肉', '53457'],
  ['西兰花炒牛肉', '世界牛肉', '鲜嫩牛肉配脆口西兰花', '53366'], ['芥末牛肉派', '世界牛肉', '酥皮裹住浓香牛肉馅', '52874'],
  ['牡蛎牛肉派', '世界牛肉', '海陆鲜味藏在酥皮里', '52878'], ['菲律宾牛肉炖菜', '世界牛肉', '酱香浓郁，适合配米饭', '53071'],
  ['空气炸锅西班牙土豆', '素食轻食', '小土豆酥脆，蒜香微辣', '53158'], ['阿尔及利亚甜椒沙拉', '素食轻食', '甜椒番茄凉拌，清爽开胃', '53288'],
  ['茄子鹰嘴豆泥烤盘', '素食轻食', '烤茄子搭配绵密鹰嘴豆泥', '53278'], ['茄子库斯库斯沙拉', '素食轻食', '烤茄子和谷物的清爽组合', '53267'],
  ['牛油果小土豆蘸酱', '素食轻食', '绵密牛油果配软糯小土豆', '53107'], ['香烤茄子泥', '素食轻食', '烟熏茄子泥，配饼或米饭都好吃', '52807'],
  ['甜菜根紫甘蓝沙拉', '素食轻食', '颜色鲜亮，酸爽脆口', '53307'], ['甜菜根煎饼', '素食轻食', '外层微脆，内里软糯', '53313'],
  ['甜菜根罗宋汤', '素食轻食', '酸甜蔬菜汤，颜色温暖', '53078'], ['黑豆蔬菜热锅', '素食轻食', '黑豆和蔬菜慢炖，饱腹轻盈', '53536']
];

async function loadMeal(id) {
  const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
  const meal = (await response.json()).meals?.[0];
  if (!meal?.strMealThumb) throw new Error('missing source image');
  const image = await fetch(meal.strMealThumb);
  if (!image.ok) throw new Error('image download failed');
  return Buffer.from(await image.arrayBuffer());
}

(async () => {
  fs.mkdirSync(uploads, { recursive: true });
  const insert = db.prepare('INSERT INTO dishes (name, description, image, category) VALUES (?, ?, ?, ?)');
  let added = 0;
  for (const [index, [name, category, description, mealId]] of dishes.entries()) {
    if (db.prepare('SELECT 1 FROM dishes WHERE name = ?').get(name)) continue;
    const basename = `world-${String(index + 1).padStart(3, '0')}`;
    const jpgFile = `${basename}.jpg`;
    const webpFile = `${basename}.webp`;
    const target = path.join(uploads, jpgFile);
    const compressed = path.join(uploads, webpFile);
    try {
      if (!fs.existsSync(target) && !fs.existsSync(compressed)) fs.writeFileSync(target, await loadMeal(mealId));
      insert.run(name, description, `/uploads/${fs.existsSync(compressed) ? webpFile : jpgFile}`, category);
      added += 1;
      console.log(`added: ${name}`);
    } catch (error) { console.warn(`skipped ${name}: ${error.message}`); }
  }
  console.log(`added ${added}; total ${db.prepare('SELECT COUNT(*) AS count FROM dishes').get().count}`);
  db.close();
})().catch(error => { console.error(error); db.close(); process.exit(1); });
