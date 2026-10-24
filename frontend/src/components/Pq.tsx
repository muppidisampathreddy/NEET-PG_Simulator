import type { Status } from '../exam.ts';

// Palette status shape (green/red/grey/purple). Pass onClick to make it a button.
export default function Pq({ s, n, current, onClick }: { s: Status; n: number; current?: boolean; onClick?: () => void }) {
  return onClick
    ? <button className={`pq ${s}${current ? ' current' : ''}`} onClick={onClick}>{n}</button>
    : <span className={`pq ${s}`}>{n}</span>;
}
