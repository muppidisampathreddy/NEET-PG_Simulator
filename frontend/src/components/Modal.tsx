import type { ReactNode } from 'react';

export default function Modal({ title, kind, onClose, children }: { title: string; kind: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget && kind !== 'confirm') onClose(); }}>
      <div className={'modal ' + kind}>
        <div className="modal-head"><span>{title}</span><button onClick={onClose}>Close &#10006;</button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
