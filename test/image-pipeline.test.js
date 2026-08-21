'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sharp = require('sharp');
const { normalizeImageBuffer, promotePendingAttachment, cleanupPendingAttachments } = require('../lib/image-pipeline');

test('uploaded images are decoded, normalized and promoted safely', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'family-images-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#f4a261' } }).jpeg().toBuffer();
  const result = await normalizeImageBuffer(source, directory, 'pending-pet');
  assert.equal(result.format, 'webp');
  assert.equal(result.width, 80);
  assert.equal(result.height, 60);
  assert.match(result.path, /^\/uploads\/pending-pet-[a-zA-Z0-9.-]+\.webp$/);
  const promoted = promotePendingAttachment(result.path, directory);
  assert.match(promoted, /^\/uploads\/pet-/);
  assert.equal(fs.existsSync(path.join(directory, path.basename(promoted))), true);
  assert.equal(cleanupPendingAttachments(directory, 0), 0);
});

test('fake image content is rejected without leaving a file', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'family-images-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  await assert.rejects(() => normalizeImageBuffer(Buffer.from('<script>alert(1)</script>'), directory, 'dish'), /可识别的图片/);
  assert.deepEqual(fs.readdirSync(directory), []);
});
