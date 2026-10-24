import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initExam, reducer, status, counts } from './exam.ts';

test('palette status rules', () => {
  let s = initExam([4, 4]);
  assert.equal(status(s.qs[0][0]), 'notanswered');        // visiting = not answered
  s = reducer(s, { t: 'select', v: 2 });
  s = reducer(s, { t: 'go', i: 3 });                       // palette jump does NOT save
  assert.equal(s.qs[0][0].saved, null);
  s = reducer(s, { t: 'go', i: 0 });
  s = reducer(s, { t: 'select', v: 2 });
  s = reducer(s, { t: 'save', mark: false });
  assert.equal(status(s.qs[0][0]), 'answered');
  assert.equal(s.cur, 1);
  s = reducer(s, { t: 'save', mark: true });              // mark without answer
  assert.equal(status(s.qs[0][1]), 'marked');
  s = reducer(s, { t: 'select', v: 1 });
  s = reducer(s, { t: 'select', v: 1 });                  // re-click deselects
  assert.equal(s.qs[0][2].draft, null);
  s = reducer(s, { t: 'select', v: 0 });
  s = reducer(s, { t: 'save', mark: true });
  assert.equal(status(s.qs[0][2]), 'ansmarked');
  s = reducer(s, { t: 'save', mark: false });             // last question wraps to first
  assert.equal(s.cur, 0);
  s = reducer(s, { t: 'clear' });
  assert.equal(status(s.qs[0][0]), 'notanswered');
  s = reducer(s, { t: 'section', s: 1 });
  assert.deepEqual([s.sec, s.cur], [1, 0]);
  assert.deepEqual(counts(s.qs[1]), { answered: 0, notanswered: 1, notvisited: 3, marked: 0, ansmarked: 0 });
});
