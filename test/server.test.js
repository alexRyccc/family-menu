'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'family-server-'));
process.env.FAMILY_DB_PATH = path.join(directory, 'family.db');
process.env.FAMILY_COOKIE_SECRET_PATH = path.join(directory, '.poll-secret');
process.env.FAMILY_NOTIFY_CONFIG_PATH = path.join(directory, 'notify.json');
process.env.FAMILY_BACKUP_DIR = path.join(directory, 'backups');
process.env.FAMILY_SKIP_STARTUP_BACKUP = '1';

const { app, db } = require('../server');
let server;
let baseUrl;

async function request(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function json(url, body, method = 'POST', headers = {}) {
  return request(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
});

test('strict API validation and notification masking are enforced', async () => {
  const user = (await json('/api/users', { name: '测试甲', avatar: '🐱', color: '#e8743b' })).data;
  const invalidNote = await json('/api/shared-notes', { author_id: user.id, note_date: '2026-02-31', content: '无效日期' });
  assert.equal(invalidNote.response.status, 400);

  const invalidReminder = await json('/api/reminders', { meal: 'breakfast', remind_time: '25:99', enabled: true });
  assert.equal(invalidReminder.response.status, 400);

  const config = await request('/api/notify/config');
  assert.equal(config.response.status, 200);
  const serialized = JSON.stringify(config.data);
  assert.equal(serialized.includes('"accessKeyId"'), false);
  assert.equal(serialized.includes('"accessKeySecret"'), false);
  assert.equal(serialized.includes('"pass"'), false);
  assert.equal(typeof config.data.sms.has_access_key_secret, 'boolean');
});

test('fake uploads fail and stored HTML names remain data', async () => {
  const fake = new FormData();
  fake.set('name', '伪图片菜');
  fake.set('image', new Blob(['<script>alert(1)</script>'], { type: 'image/jpeg' }), 'fake.jpg');
  const rejected = await request('/api/dishes', { method: 'POST', body: fake });
  assert.equal(rejected.response.status, 400);

  const dishForm = new FormData();
  dishForm.set('name', '<b>安全菜名</b>');
  dishForm.set('category', '测试');
  const created = await request('/api/dishes', { method: 'POST', body: dishForm });
  assert.equal(created.response.status, 200);
  assert.equal(created.data.name, '<b>安全菜名</b>');
});

test('classic votes can only be closed by their declared creator', async () => {
  const owner = (await json('/api/users', { name: '发起人', avatar: '🐱', color: '#159570' })).data;
  const other = (await json('/api/users', { name: '其他人', avatar: '🐱', color: '#2878b5' })).data;
  const dishForm = new FormData();
  dishForm.set('name', '投票测试菜');
  const dish = (await request('/api/dishes', { method: 'POST', body: dishForm })).data;
  const vote = (await json('/api/votes', { title: '测试投票', meal: 'lunch', date: '2026-08-21', dish_ids: [dish.id], created_by: owner.id })).data;
  assert.equal((await json(`/api/votes/${vote.id}/close`, { created_by: other.id })).response.status, 403);
  assert.equal((await json(`/api/votes/${vote.id}/close`, { created_by: owner.id })).response.status, 200);
});

test('shared polls use the server-issued voter cookie', async () => {
  const owner = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  const created = await json('/api/family-polls', { title: '周末去哪', created_by: owner.id, options: ['公园', '看电影'] });
  const code = created.data.share_code;
  const opened = await request(`/api/family-polls/share/${code}`);
  const cookie = opened.response.headers.get('set-cookie');
  assert.match(cookie, /fm_poll_voter=/);
  assert.match(cookie, /HttpOnly/);
  const first = await json(`/api/family-polls/share/${code}/vote`, { option_id: created.data.options[0].id, voter_name: '访客' }, 'POST', { Cookie: cookie.split(';')[0] });
  const second = await json(`/api/family-polls/share/${code}/vote`, { option_id: created.data.options[1].id, voter_name: '访客' }, 'POST', { Cookie: cookie.split(';')[0] });
  assert.equal(first.data.total_votes, 1);
  assert.equal(second.data.total_votes, 1);
  assert.equal(second.data.voter_choice, created.data.options[1].id);
});
