import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { clean } from '../sanitize.ts';

// Question text with highlight + annotation. The DOM is edited directly (wrapping selections in <mark>),
// so React renders it once per question (parent keys this by question id) and we report HTML back via onChange.
export default function QuestionText({ html, enabled, onChange }: { html: string; enabled: boolean; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mark, setMark] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState(false);
  const [note, setNote] = useState('');

  useLayoutEffect(() => {
    const el = ref.current!;
    el.innerHTML = clean(html);
    el.querySelectorAll('table.match').forEach(t => { // match tables zoom like images
      if (t.parentElement?.classList.contains('zoom')) return;
      const z = document.createElement('span');
      z.className = 'zoom';
      t.replaceWith(z);
      z.append(t);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mark) return;
    const close = (e: globalThis.MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.annot-bar, .annot-box, mark.hl')) { setMark(null); setBox(false); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [mark]);

  const save = () => onChange(ref.current!.innerHTML);

  const onMouseUp = () => {
    const sel = getSelection();
    if (!enabled || !sel || sel.isCollapsed || !ref.current!.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0), m = document.createElement('mark');
    m.className = 'hl';
    try { range.surroundContents(m); } catch { m.append(range.extractContents()); range.insertNode(m); }
    sel.removeAllRanges();
    save();
    setMark(m);
    setBox(false);
  };
  const onClick = (e: MouseEvent) => {
    const m = (e.target as HTMLElement).closest<HTMLElement>('mark.hl');
    if (m) { setMark(m); setBox(false); }
  };

  const r = mark?.getBoundingClientRect();
  return (<>
    <div className="qtext" ref={ref} onMouseUp={onMouseUp} onClick={onClick} />
    {mark && r && createPortal(
      <div className="annot-bar" style={{ left: r.left, top: r.top - 34 }}>
        <button title="Add annotation" onClick={() => { setNote(mark.dataset.note ?? ''); setBox(true); }}>&#128172;</button>
        <button title="Remove highlight" onClick={() => { mark.replaceWith(...mark.childNodes); save(); setMark(null); }}>&#128465;</button>
      </div>, document.body)}
    {mark && r && box && createPortal(
      <div className="annot-box" style={{ left: r.left, top: r.bottom + 6 }}>
        <div>Annotation</div>
        <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} />
        <div className="annot-btns">
          <button onClick={() => setBox(false)}>Cancel</button>
          <button onClick={() => { mark.dataset.note = mark.title = note; save(); setMark(null); setBox(false); }}>Save</button>
        </div>
      </div>, document.body)}
  </>);
}
