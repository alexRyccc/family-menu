'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const { createBackup, pruneBackups, integrityReport } = require('../lib/db-maintenance');

const command = process.argv[2] || 'check';
const databasePath = process.env.FAMILY_DB_PATH || path.join(__dirname, '..', 'data', 'family.db');
const backupDirectory = process.env.FAMILY_BACKUP_DIR || path.join(__dirname, '..', 'data', 'backups');
const db = new Database(databasePath, { readonly: command === 'check' });

try {
  if (command === 'backup') {
    const destination = createBackup(db, backupDirectory);
    pruneBackups(backupDirectory, 10);
    console.log(`数据库备份完成: ${destination}`);
  } else if (command === 'check') {
    const report = integrityReport(db);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } else {
    console.error('用法: node scripts/db-maintenance.js <check|backup>');
    process.exitCode = 2;
  }
} finally {
  db.close();
}
