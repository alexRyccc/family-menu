const fs = require('fs');
const path = require('path');
const { travelCities } = require('./travel-cities');

const targetDir = path.join(__dirname, 'public', 'assets', 'travel');
fs.mkdirSync(targetDir, { recursive: true });

const blockedWords = ['map', 'flag', 'coat of arms', 'logo', 'icon', 'location'];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'family-menu-travel-gallery/1.0' } });
      if (response.ok) return response.json();
      lastError = new Error(`Wikimedia 请求失败: ${response.status}`);
    } catch (error) { lastError = error; }
    await sleep(3000 * (attempt + 1));
  }
  throw lastError;
}

async function mediaSearch(query) {
  const searchUrl = new URL('https://commons.wikimedia.org/w/api.php');
  searchUrl.search = new URLSearchParams({ action: 'query', list: 'search', srsearch: query, srnamespace: '6', srlimit: '24', format: 'json', origin: '*' }).toString();
  const pageIds = (await fetchJson(searchUrl)).query?.search?.map(item => item.pageid).filter(Boolean) || [];
  if (!pageIds.length) return [];
  const detailsUrl = new URL('https://commons.wikimedia.org/w/api.php');
  detailsUrl.search = new URLSearchParams({ action: 'query', pageids: pageIds.join('|'), prop: 'imageinfo', iiprop: 'url', iiurlwidth: '1200', format: 'json', origin: '*' }).toString();
  const data = await fetchJson(detailsUrl);
  return Object.values(data.query?.pages || {}).map(page => ({ title: page.title || '', url: page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url || '' }))
    .filter(item => item.url && /\.jpe?g(\?|$)/i.test(item.url) && !blockedWords.some(word => item.title.toLowerCase().includes(word)));
}

async function download(url, destination) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'family-menu-travel-gallery/1.0' } });
      if (response.ok) {
        const data = Buffer.from(await response.arrayBuffer());
        if (data.length < 12 * 1024) throw new Error('图片体积过小');
        fs.writeFileSync(destination, data);
        return;
      }
      lastError = new Error(`图片下载失败: ${response.status}`);
      if (response.status !== 429 && response.status < 500) throw lastError;
    } catch (error) {
      lastError = error;
    }
    await sleep(2400 * (attempt + 1));
  }
  throw lastError;
}

async function main() {
  const requestedKeys = new Set(process.argv.slice(2));
  const cities = requestedKeys.size ? travelCities.filter(city => requestedKeys.has(city.key)) : travelCities;
  for (const city of cities) {
    const files = [1, 2, 3].map(index => path.join(targetDir, `${city.key}-${index}.jpg`));
    if (files.every(file => fs.existsSync(file) && fs.statSync(file).size > 12 * 1024)) {
      console.log(`已存在: ${city.name}`);
      continue;
    }
    const candidates = await mediaSearch(city.query);
    if (candidates.length < 3) throw new Error(`${city.name} 可用图片不足 3 张，请人工核对来源`);
    for (let index = 0; index < 3; index += 1) {
      if (fs.existsSync(files[index]) && fs.statSync(files[index]).size > 12 * 1024) continue;
      await download(candidates[index].url, files[index]);
      console.log(`已下载: ${city.name} ${index + 1}/3`);
      await sleep(300);
    }
    await sleep(250);
  }
  console.log('原图已就绪。运行 python compress-recommendation-images.py 生成并压缩六图画廊。');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
