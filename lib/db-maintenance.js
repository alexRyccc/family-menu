'use strict';

const fs = require('fs');
const path = require('path');

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function createBackup(db, backupDirectory, sourceName = 'family') {
  fs.mkdirSync(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(backupDirectory, `${sourceName}-${stamp}.db`);
  db.exec(`VACUUM INTO ${sqlString(destination)}`);
  return destination;
}

function pruneBackups(backupDirectory, keep = 10) {
  if (!fs.existsSync(backupDirectory)) return [];
  const files = fs.readdirSync(backupDirectory)
    .filter(name => name.endsWith('.db'))
    .map(name => ({ name, path: path.join(backupDirectory, name), mtime: fs.statSync(path.join(backupDirectory, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const removed = [];
  for (const file of files.slice(Math.max(1, keep))) {
    fs.unlinkSync(file.path);
    removed.push(file.path);
  }
  return removed;
}

function runMigrations(db, migrations) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`);
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map(row => row.version));
  const applyMigration = db.transaction(migration => {
    migration.up(db);
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
    db.pragma(`user_version = ${migration.version}`);
  });
  for (const migration of [...migrations].sort((a, b) => a.version - b.version)) {
    if (!applied.has(migration.version)) applyMigration(migration);
  }
}

function integrityReport(db) {
  const integrity = db.pragma('integrity_check');
  const foreignKeys = db.pragma('foreign_key_check');
  return { ok: integrity.length === 1 && integrity[0].integrity_check === 'ok' && foreignKeys.length === 0, integrity, foreignKeys };
}

module.exports = { createBackup, pruneBackups, runMigrations, integrityReport };
