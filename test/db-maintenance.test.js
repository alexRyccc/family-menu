'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const { createBackup, runMigrations, integrityReport } = require('../lib/db-maintenance');

test('migrations are idempotent and backups are consistent', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'family-db-'));
  const db = new Database(path.join(directory, 'source.db'));
  t.after(() => {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  });
  db.exec('CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT); INSERT INTO sample(value) VALUES (\'hello\')');
  let runs = 0;
  const migrations = [{ version: 1, name: 'test', up(database) { runs += 1; database.exec('CREATE INDEX idx_sample_value ON sample(value)'); } }];
  runMigrations(db, migrations);
  runMigrations(db, migrations);
  assert.equal(runs, 1);
  assert.equal(db.pragma('user_version', { simple: true }), 1);
  const backupPath = createBackup(db, path.join(directory, 'backups'), 'test');
  const backup = new Database(backupPath, { readonly: true });
  assert.equal(backup.prepare('SELECT value FROM sample').get().value, 'hello');
  assert.equal(integrityReport(backup).ok, true);
  backup.close();
});
