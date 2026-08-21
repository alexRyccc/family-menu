'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 20_000_000;
const MAX_UPLOAD_DIR_BYTES = 250 * 1024 * 1024;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function directorySize(directory) {
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    if (!entry.isFile()) return total;
    try { return total + fs.statSync(path.join(directory, entry.name)).size; } catch (_) { return total; }
  }, 0);
}

function safeUploadPath(publicPath, directory) {
  if (typeof publicPath !== 'string' || !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(publicPath)) return null;
  const filePath = path.resolve(directory, path.basename(publicPath));
  return filePath.startsWith(`${path.resolve(directory)}${path.sep}`) ? filePath : null;
}

async function normalizeImageBuffer(buffer, directory, prefix) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw badRequest('图片大小无效，最大支持 5MB');
  }
  if (directorySize(directory) >= MAX_UPLOAD_DIR_BYTES) throw badRequest('图片存储空间已满，请先清理旧附件');

  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, animated: false }).metadata();
  } catch (_) {
    throw badRequest('文件不是可识别的图片');
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw badRequest('图片像素过大，最大支持 2000 万像素');
  }
  if (metadata.pages && metadata.pages > 1) throw badRequest('暂不支持动态图片');

  fs.mkdirSync(directory, { recursive: true });
  const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  const finalPath = path.join(directory, filename);
  const tempPath = `${finalPath}.tmp`;
  try {
    const result = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, animated: false })
      .rotate()
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(tempPath);
    fs.renameSync(tempPath, finalPath);
    return {
      path: `/uploads/${filename}`,
      width: result.width,
      height: result.height,
      format: 'webp',
      size: result.size
    };
  } catch (error) {
    try { fs.unlinkSync(tempPath); } catch (_) {}
    try { fs.unlinkSync(finalPath); } catch (_) {}
    if (/Input image exceeds pixel limit/i.test(error.message)) throw badRequest('图片像素过大，最大支持 2000 万像素');
    throw badRequest('图片处理失败，请换一张图片');
  }
}

function promotePendingAttachment(publicPath, directory) {
  const currentPath = safeUploadPath(publicPath, directory);
  if (!currentPath || !fs.existsSync(currentPath) || !path.basename(currentPath).startsWith('pending-pet-')) return '';
  const filename = `pet-${path.basename(currentPath).slice('pending-pet-'.length)}`;
  const nextPath = path.join(directory, filename);
  fs.renameSync(currentPath, nextPath);
  return `/uploads/${filename}`;
}

function cleanupPendingAttachments(directory, olderThanMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - olderThanMs;
  if (!fs.existsSync(directory)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith('pending-pet-')) continue;
    const filePath = path.join(directory, entry.name);
    try {
      if (fs.statSync(filePath).mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        removed += 1;
      }
    } catch (_) {}
  }
  return removed;
}

module.exports = {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_DIR_BYTES,
  directorySize,
  safeUploadPath,
  normalizeImageBuffer,
  promotePendingAttachment,
  cleanupPendingAttachments
};
