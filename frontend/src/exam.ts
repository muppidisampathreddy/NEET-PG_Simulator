// Pure exam state logic (no React) so it can be unit tested with `npm test`. Scoring happens on the server.

export type QState = { visited: boolean; saved: number | null; draft: number | null; marked: boolean };
export type Status = 'answered' | 'notanswered' | 'notvisited' | 'marked' | 'ansmarked';
export type ExamState = { sec: number; cur: number; qs: QState[][] };
export type Action =
  | { t: 'go'; i: number }
  | { t: 'select'; v: number }
  | { t: 'save'; mark: boolean }
  | { t: 'clear' }
  | { t: 'section'; s: number };

export const STATUSES: [Status, string][] = [
  ['answered', 'Answered'], ['notanswered', 'Not Answered'], ['notvisited', 'Not Visited'],
  ['marked', 'Marked for Review'], ['ansmarked', 'Answered & Marked for Review'],
];

export function initExam(sizes: number[]): ExamState {
  const qs = sizes.map(n => Array.from({ length: n }, () => ({ visited: false, saved: null, draft: null, marked: false })));
  qs[0][0].visited = true;
  return { sec: 0, cur: 0, qs };
}

export function status(q: QState): Status {
  if (!q.visited) return 'notvisited';
  if (q.marked) return q.saved != null ? 'ansmarked' : 'marked';
  return q.saved != null ? 'answered' : 'notanswered';
}

export function counts(qs: QState[]): Record<Status, number> {
  const c = { answered: 0, notanswered: 0, notvisited: 0, marked: 0, ansmarked: 0 };
  qs.forEach(q => c[status(q)]++);
  return c;
}

export function reducer(s: ExamState, a: Action): ExamState {
  // ponytail: copies the whole grid per action; it's ~200 tiny objects at most
  const qs = s.qs.map(sec => sec.map(q => ({ ...q })));
  const q = qs[s.sec][s.cur];
  const go = (sec: number, i: number): ExamState => {
    q.draft = q.saved; // leaving without saving discards the selection
    const n = qs[sec][i];
    n.visited = true;
    n.draft = n.saved;
    return { sec, cur: i, qs };
  };
  switch (a.t) {
    case 'go': return go(s.sec, a.i);
    case 'select': q.draft = q.draft === a.v ? null : a.v; return { ...s, qs }; // re-click deselects
    case 'save': q.saved = q.draft; q.marked = a.mark; return go(s.sec, (s.cur + 1) % qs[s.sec].length);
    case 'clear': q.draft = q.saved = null; return { ...s, qs };
    case 'section': return go(a.s, 0);
  }
}

export const sectionName = (i: number) => `Section ${String.fromCharCode(65 + i)}`;
