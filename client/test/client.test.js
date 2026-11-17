import test from 'node:test';
import assert from 'node:assert/strict';
import { formatKes, formatDate, formatTime } from '../src/utils/format.js';

test('Client formatting utilities', async (t) => {
  await t.test('formats minor integer units (cents) into Kenyan Shillings (KES)', () => {
    assert.equal(formatKes(0), 'KSh 0.00');
    assert.equal(formatKes(22000), 'KSh 220.00');
    assert.equal(formatKes(150050), 'KSh 1,500.50');
    assert.equal(formatKes(10000000), 'KSh 100,000.00');
  });

  await t.test('formats dates consistently', () => {
    const d = new Date('2026-11-17T12:00:00Z');
    const formatted = formatDate(d);
    assert.ok(formatted.includes('2026') || formatted.includes('Nov'));
  });
});
