import { useEffect, useState } from 'react';

const Arrow = ({ size = 15 }: { size?: number }) => <span style={{ fontSize: size }}>&#10148;</span>;

// Always mounted so settings survive closing the popover; `anchor` is the button rect when open.
export default function Accessibility({ anchor, onClose }: { anchor: DOMRect | null; onClose: () => void }) {
  const [dark, setDark] = useState(false);
  const [fs, setFs] = useState('1');
  const [cur, setCur] = useState(0);
  const [trail, setTrail] = useState(false);

  useEffect(() => {
    const h = document.documentElement;
    h.classList.toggle('dark', dark);
    h.classList.toggle('cur1', cur === 1);
    h.classList.toggle('cur2', cur === 2);
    h.style.setProperty('--fs', fs);
  }, [dark, fs, cur]);
  useEffect(() => () => {
    document.documentElement.classList.remove('dark', 'cur1', 'cur2');
    document.documentElement.style.removeProperty('--fs');
  }, []);

  useEffect(() => {
    if (!trail) return;
    const move = (e: MouseEvent) => {
      const d = document.createElement('div');
      d.className = 'trail';
      d.style.left = e.clientX + 'px';
      d.style.top = e.clientY + 'px';
      document.body.append(d);
      requestAnimationFrame(() => { d.style.opacity = '0'; d.style.transform = 'scale(.2)'; });
      setTimeout(() => d.remove(), 500);
    };
    addEventListener('mousemove', move);
    return () => removeEventListener('mousemove', move);
  }, [trail]);

  useEffect(() => {
    if (!anchor) return;
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.access, #btn-access')) onClose(); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [anchor, onClose]);

  if (!anchor) return null;
  const on = (b: boolean) => (b ? 'on' : '');
  return (
    <div className="popover access" style={{ left: anchor.left - 130, top: anchor.bottom + 10 }}>
      <h3>Accessibility Adjustments</h3>
      <div className="acc-grid">
        <div className="acc-cell"><div>Switch to<br />Dark Mode</div>
          <div className="pill"><button className={on(!dark)} onClick={() => setDark(false)}>&#9728;</button><button className={on(dark)} onClick={() => setDark(true)}>&#9790;</button></div></div>
        <div className="acc-cell"><div>Select<br />Font Size</div>
          <div className="fsz">{['1', '1.12', '1.25'].map(v => <button key={v} className={on(fs === v)} onClick={() => setFs(v)}>A</button>)}</div></div>
        <div className="acc-cell"><div>Enable<br />Cursor Trail</div>
          <div className="fsz"><button id="trail-btn" className={'cur ' + on(trail)} title="Cursor trail" onClick={() => setTrail(t => !t)}><Arrow /></button></div></div>
        <div className="acc-cell"><div>Choose<br />Cursor Size</div>
          <div className="fsz">{[15, 20, 26].map((s, i) => <button key={s} className={'cur ' + on(cur === i)} onClick={() => setCur(i)}><Arrow size={s} /></button>)}</div></div>
      </div>
      <label className="acc-reset"><input type="radio" checked={false} onChange={() => { setDark(false); setFs('1'); setCur(0); setTrail(false); }} /> Reset to Default</label>
    </div>
  );
}
