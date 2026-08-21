const fs = require('fs');
const path = require('path');
const { superRecommendations } = require('./super-recommendations');

const targetDir = path.join(__dirname, 'public', 'assets', 'super-recommendations');
fs.mkdirSync(targetDir, { recursive: true });

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function photoUrl(query, lock) {
  const tags = query.split(/\s+/).slice(0, 4).map(encodeURIComponent).join(',');
  return `https://loremflickr.com/960/720/${tags}?lock=${lock}`;
}

async function download(url, destination) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'family-menu-super-recommendations/1.0' } });
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
  for (const item of superRecommendations) {
    const destination = path.join(targetDir, `${item.key}.jpg`);
    if (fs.existsSync(destination) && fs.statSync(destination).size > 12 * 1024) {
      console.log(`已存在: ${item.title}`);
      continue;
    }
    const source = photoUrl(item.query, 100 + superRecommendations.indexOf(item));
    await download(source, destination);
    console.log(`已下载: ${item.title}`);
    await sleep(650);
  }
  console.log('请逐张人工核对新下载图片；正式资源以仓库中已审核版本为准。');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
