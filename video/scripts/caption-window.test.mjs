import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCaptionWindow } from '../src/utils/caption-window.ts';

test('empty cue has an empty window', () => {
  assert.deepEqual(selectCaptionWindow(0, 0, 6), { start: 0, end: 0 });
});

test('short cue renders a single stable window', () => {
  assert.deepEqual(selectCaptionWindow(5, 3, 6), { start: 0, end: 5 });
});

test('window advances in fixed chunks instead of per word', () => {
  assert.deepEqual(selectCaptionWindow(14, 0, 6), { start: 0, end: 6 });
  assert.deepEqual(selectCaptionWindow(14, 5, 6), { start: 0, end: 6 });
  assert.deepEqual(selectCaptionWindow(14, 6, 6), { start: 6, end: 12 });
  assert.deepEqual(selectCaptionWindow(14, 11, 6), { start: 6, end: 12 });
  assert.deepEqual(selectCaptionWindow(14, 12, 6), { start: 8, end: 14 });
});

test('never ends a cue on a one-word orphan', () => {
  assert.deepEqual(selectCaptionWindow(7, 6, 6), { start: 1, end: 7 });
  assert.deepEqual(selectCaptionWindow(13, 12, 6), { start: 7, end: 13 });
});

test('window never exceeds the requested size', () => {
  for (let total = 1; total <= 40; total += 1) {
    for (let active = -2; active < total + 3; active += 1) {
      const window = selectCaptionWindow(total, active, 6);
      assert.ok(window.start >= 0);
      assert.ok(window.end <= total);
      assert.ok(window.end > window.start);
      assert.ok(window.end - window.start <= 6);
      assert.ok(active < 0 || active >= window.start);
    }
  }
});

test('invalid limits still produce a visible token', () => {
  assert.deepEqual(selectCaptionWindow(4, 2, 0), { start: 2, end: 3 });
});
