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
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { 'user-agent': 'family-menu-travel-gallery/1.0' } });
    if (response.ok) {
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length < 12 * 1024) throw new Error('图片体积过小');
      fs.writeFileSync(destination, data);
      return;
    }
    if (response.status !== 429 || attempt === 3) throw new Error(`图片下载失败: ${response.status}`);
    await sleep(5000 * (attempt + 1));
  }
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
    let results = await mediaSearch(city.query);
    if (results.length < 3) results = await mediaSearch(city.query.split(' ').slice(0, 2).join(' '));
    if (results.length < 3) throw new Error(`${city.name} 没有找到足够的可下载图片`);
    for (let index = 0; index < 3; index += 1) {
      await download(results[index].url, files[index]);
      console.log(`已下载: ${city.name} ${index + 1}/3`);
      await sleep(1800);
    }
    await sleep(500);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
