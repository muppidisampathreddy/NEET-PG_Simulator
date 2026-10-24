import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const W = 340, H = 290, ZOOM = 2;

// ponytail: the lens shows a DOM clone of #app refreshed on mouse move; only the question pane's scroll is mirrored
export default function Magnifier() {
  const lens = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const el = lens.current!, app = document.getElementById('app')!;
      const clone = app.cloneNode(true) as HTMLElement;
      const wrap = document.createElement('div');
      Object.assign(wrap.style, { width: innerWidth + 'px', height: innerHeight + 'px', left: W / 2 - e.clientX * ZOOM + 'px', top: H / 2 - e.clientY * ZOOM + 'px' });
      clone.style.height = innerHeight + 'px';
      wrap.append(clone);
      el.replaceChildren(wrap);
      const qb = clone.querySelector('.qbody');
      if (qb) qb.scrollTop = document.querySelector('#app .qbody')!.scrollTop;
      el.style.left = Math.min(e.clientX + 20, innerWidth - W - 4) + 'px';
      el.style.top = Math.min(e.clientY + 20, innerHeight - H - 4) + 'px';
    };
    addEventListener('mousemove', move);
    return () => removeEventListener('mousemove', move);
  }, []);
  return createPortal(<div className="lens" ref={lens} />, document.body);
}
