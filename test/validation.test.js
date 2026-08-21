'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { positiveInt, isDate, isTime, isPrivateIp } = require('../lib/validation');

test('strict date validation rejects calendar rollovers', () => {
  assert.equal(isDate('2026-02-28'), true);
  assert.equal(isDate('2024-02-29'), true);
  assert.equal(isDate('2026-02-29'), false);
  assert.equal(isDate('2026-02-31'), false);
  assert.equal(isDate('not-a-date'), false);
});

test('time and positive integer validation are strict', () => {
  assert.equal(isTime('23:59'), true);
  assert.equal(isTime('24:00'), false);
  assert.equal(isTime('9:30'), false);
  assert.equal(positiveInt('12'), 12);
  assert.equal(positiveInt('1.2'), null);
  assert.equal(positiveInt('-1'), null);
});

test('private and metadata addresses are blocked', () => {
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('169.254.169.254'), true);
  assert.equal(isPrivateIp('100.64.1.1'), true);
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('::1'), true);
});
