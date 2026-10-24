import { useState } from 'react';
import type { PointerEvent } from 'react';

type Calc = { val: string; acc: number | null; op: string | null; fresh: boolean; mem: number; expr: string };
const INIT: Calc = { val: '0', acc: null, op: null, fresh: true, mem: 0, expr: '' };
const fmt = (n: number) => (isFinite(n) ? String(parseFloat(n.toPrecision(12))) : 'Infinity');
const OPS: Record<string, (a: number, b: number) => number> = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => a / b };

// Immediate-execution calculator, like the Windows-style one in the exam.
export function press(c: Calc, k: string): Calc {
  const v = parseFloat(c.val);
  if (/^[0-9]$/.test(k)) return { ...c, val: c.fresh || c.val === '0' ? k : c.val + k, fresh: false };
  if (k === '.') { const val = c.fresh ? '0' : c.val; return { ...c, val: val.includes('.') ? val : val + '.', fresh: false }; }
  if (k in OPS) { const acc = c.op && !c.fresh ? OPS[c.op](c.acc!, v) : v; return { ...c, acc, op: k, fresh: true, val: fmt(acc), expr: `${fmt(acc)} ${k}` }; }
  if (k === '=') return c.op ? { ...c, val: fmt(OPS[c.op](c.acc!, v)), expr: '', op: null, acc: null, fresh: true } : { ...c, fresh: true };
  if (k === 'C') return { ...INIT, mem: c.mem };
  if (k === 'back') return c.fresh ? c : { ...c, val: c.val.slice(0, -1) || '0' };
  if (k === 'neg') return { ...c, val: fmt(-v) };
  if (k === 'sqrt') return { ...c, expr: `sqrt(${c.val})`, val: fmt(Math.sqrt(v)), fresh: true };
  if (k === '1/x') return { ...c, expr: `reciproc(${c.val})`, val: fmt(1 / v), fresh: true };
  if (k === '%') return { ...c, val: fmt((c.acc ?? 0) * v / 100), fresh: true };
  if (k === 'MC') return { ...c, mem: 0 };
  if (k === 'MR') return { ...c, val: fmt(c.mem), fresh: true };
  if (k === 'MS') return { ...c, mem: v };
  if (k === 'M+') return { ...c, mem: c.mem + v };
  if (k === 'M-') return { ...c, mem: c.mem - v };
  return c;
}

// [label, className, key]
const KEYS: [string, string, string][] = [
  ['MC', '', 'MC'], ['MR', '', 'MR'], ['MS', '', 'MS'], ['M+', '', 'M+'], ['M-', '', 'M-'],
  ['←', 'r w2', 'back'], ['C', 'r', 'C'], ['+/-', 'r', 'neg'], ['sqrt', '', 'sqrt'],
  ['7', '', '7'], ['8', '', '8'], ['9', '', '9'], ['/', '', '/'], ['%', '', '%'],
  ['4', '', '4'], ['5', '', '5'], ['6', '', '6'], ['*', '', '*'], ['1/x', '', '1/x'],
  ['1', '', '1'], ['2', '', '2'], ['3', '', '3'], ['-', '', '-'], ['=', 'eq', '='],
  ['0', 'w2', '0'], ['.', '', '.'], ['+', '', '+'],
];

type BodyProps = { c?: Calc; onKey?: (k: string) => void; onMin?: () => void; onClose?: () => void; onDrag?: (e: PointerEvent) => void };

export function CalcBody({ c = INIT, onKey, onMin, onClose, onDrag }: BodyProps) {
  return (<>
    <div className="calc-head" onPointerDown={onDrag}>
      <span>Normal Calculator</span>
      <span onPointerDown={e => e.stopPropagation()}><b onClick={onMin}>&#9472;</b><b onClick={onClose}>&#10006;</b></span>
    </div>
    <div className="calc-screen"><div>{c.expr}</div><div>{c.val}</div></div>
    <div className="calc-keys">{KEYS.map(([l, cls, k]) => <button key={k} className={cls} onClick={() => onKey?.(k)}>{l}</button>)}</div>
  </>);
}

export default function Calculator({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const [c, setC] = useState(INIT);
  const [pos, setPos] = useState({ x, y });
  const [min, setMin] = useState(false);
  const drag = (e: PointerEvent) => {
    const dx = e.clientX - pos.x, dy = e.clientY - pos.y;
    const move = (ev: globalThis.PointerEvent) => setPos({ x: ev.clientX - dx, y: ev.clientY - dy });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true });
  };
  return (
    <div className={'calc' + (min ? ' min' : '')} style={{ left: pos.x, top: pos.y }}>
      <CalcBody c={c} onKey={k => setC(p => press(p, k))} onMin={() => setMin(m => !m)} onClose={onClose} onDrag={drag} />
    </div>
  );
}
