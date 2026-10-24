import { useEffect, useReducer, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Exam as ExamT, Question } from '../api.ts';
import { CONFIG } from '../config.ts';
import { counts, initExam, reducer, sectionName, status, STATUSES } from '../exam.ts';
import type { QState } from '../exam.ts';
import { clean } from '../sanitize.ts';
import Accessibility from './Accessibility.tsx';
import Calculator from './Calculator.tsx';
import { Instr1, Instr2 } from './Instructions.tsx';
import Magnifier from './Magnifier.tsx';
import Modal from './Modal.tsx';
import Pq from './Pq.tsx';
import QuestionText from './QuestionText.tsx';
import { SummaryTable } from './Result.tsx';

const WATERMARK = (() => {
  const t = CONFIG.candidate.watermark;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="375" height="285"><g font-family="Arial" font-style="italic" font-weight="bold" font-size="22" fill="rgba(0,0,0,0.075)"><text transform="translate(40 250) rotate(-35)">${t}</text><text transform="translate(230 110) rotate(-35)">${t}</text></g></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

type ModalState = { kind: 'instr' } | { kind: 'submit' } | { kind: 'img'; html: string } | null;

export default function Exam({ exam, bySec, onFinish }: { exam: ExamT; bySec: Question[][]; onFinish: (qs: QState[][]) => void }) {
  const [s, dispatch] = useReducer(reducer, bySec.map(q => q.length), initExam);
  const SECS = bySec.length, M = exam.minutes_per_section * 60;
  const [left, setLeft] = useState(M);
  const [collapsed, setCollapsed] = useState(false);
  const [calc, setCalc] = useState<{ x: number; y: number } | null>(null);
  const [annot, setAnnot] = useState(true);
  const [access, setAccess] = useState<DOMRect | null>(null);
  const [magnify, setMagnify] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [preview, setPreview] = useState<{ html: string; x: number; y: number } | null>(null);
  const [secInfo, setSecInfo] = useState<{ sec: number; x: number; y: number } | null>(null);
  const qbody = useRef<HTMLDivElement>(null);
  const highlights = useRef<Record<number, string>>({}); // question id -> annotated HTML
  const done = useRef(false);

  const finish = () => { if (!done.current) { done.current = true; onFinish(s.qs); } };

  useEffect(() => {
    const t = setInterval(() => setLeft(l => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { // section time over -> next section, or auto-submit after the last
    if (left >= 0) return;
    if (s.sec < SECS - 1) { dispatch({ t: 'section', s: s.sec + 1 }); setLeft(M); } else finish();
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { qbody.current!.scrollTop = 0; }, [s.sec, s.cur]);

  const q = s.qs[s.sec][s.cur], d = bySec[s.sec][s.cur], c = counts(s.qs[s.sec]);

  const zoomOf = (e: MouseEvent) => (e.target as HTMLElement).closest<HTMLElement>('.zoom');
  const onOver = (e: MouseEvent) => {
    const z = zoomOf(e);
    if (!z) return;
    const r = z.getBoundingClientRect();
    setPreview({ html: z.innerHTML, x: r.right + 14, y: Math.max(60, r.top) });
  };

  // plain function (not a component) so the icon isn't remounted on every timer tick
  const info = (sec: number) => (
    <i className="info"
      onMouseEnter={e => {
        const tab = e.currentTarget.closest('.tab, .subtab')!.getBoundingClientRect();
        setSecInfo({ sec, x: tab.left, y: e.currentTarget.getBoundingClientRect().bottom + 8 });
      }}
      onMouseLeave={() => setSecInfo(null)}>i</i>
  );

  return (
    <section id="screen-exam" className="screen active">
      <div className="topbar">
        <span className="mock-link">Static Mock Link for {exam.title}</span>
        <span className="top-links">
          <button id="btn-access" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setAccess(a => (a ? null : r)); }}><i className="ic ic-green">&#9817;</i>Accessibility</button>
          <button onClick={() => setMagnify(m => !m)} style={{ textDecoration: magnify ? 'underline' : undefined }}><i className="ic ic-orange">&#9906;</i>Screen Magnifier</button>
          <button onClick={() => setModal({ kind: 'instr' })}><i className="ic ic-blue">i</i>Instructions</button>
        </span>
      </div>

      <div className={'exam' + (collapsed ? ' collapsed' : '')}>
        <div className="exam-left">
          <div className="tabbar">
            <div className="tabs">{bySec.map((_, i) => <span key={i} className={'tab' + (i === s.sec ? ' active' : '')}>{sectionName(i)} {info(i)}</span>)}</div>
            <div className="tools">
              <button className={'tool' + (annot ? ' active' : '')} title="Annotation" onClick={() => setAnnot(a => !a)}>
                <svg viewBox="0 0 24 24" width="22" height="22"><rect x="1" y="5" width="12" height="14" fill="#f39c12" /><text x="7" y="16.5" fontSize="11" fontFamily="Arial" fontWeight="bold" fill="#fff" textAnchor="middle">A</text><path d="M16 3h5M18.5 3v18M16 21h5" stroke="#f39c12" strokeWidth="1.8" fill="none" /></svg>
              </button>
              <button className="tool" title="Calculator" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setCalc(p => (p ? null : { x: r.left + 10, y: r.bottom + 2 })); }}>
                <svg viewBox="0 0 24 24" width="22" height="22"><rect x="4" y="1" width="16" height="22" rx="2.5" fill="#f39c12" /><rect x="7" y="4" width="10" height="5" fill="#fff" /><g fill="#fff"><circle cx="8.5" cy="13" r="1.2" /><circle cx="12" cy="13" r="1.2" /><circle cx="15.5" cy="13" r="1.2" /><circle cx="8.5" cy="17.5" r="1.2" /><circle cx="12" cy="17.5" r="1.2" /><circle cx="15.5" cy="17.5" r="1.2" /></g></svg>
              </button>
            </div>
          </div>
          <div className="row-sections"><b>Sections</b><b className="timer">Time Left : {mmss(Math.max(left, 0))}</b></div>
          <div className="row-sub"><span className="subtab">{sectionName(s.sec)} {info(s.sec)}</span></div>
          <div className="row-qtype"><b>Question Type: MCQ</b><span>Marks for correct answer: <em className="green">{exam.marks_correct}</em> | Negative Marks: <em className="red">{exam.marks_wrong}</em></span></div>
          <div className="row-qno"><b>Question No. {s.cur + 1}</b>
            <span className="scrollers">
              <button title="Go to bottom" onClick={() => { qbody.current!.scrollTop = 1e6; }}>&#8595;</button>
              <button title="Go to top" onClick={() => { qbody.current!.scrollTop = 0; }}>&#8593;</button>
            </span>
          </div>
          <div className="qbody watermark" ref={qbody} style={{ backgroundImage: WATERMARK }}
            onMouseOver={onOver}
            onMouseOut={e => { if (zoomOf(e)) setPreview(null); }}
            onClick={e => { const z = zoomOf(e); if (z) { setPreview(null); setModal({ kind: 'img', html: z.innerHTML }); } }}>
            <QuestionText key={d.id} html={highlights.current[d.id] ?? d.text} enabled={annot} onChange={h => { highlights.current[d.id] = h; }} />
            {d.image && <div><span className="zoom"><img src={d.image} alt="Question image" /></span></div>}
            <div className="options">
              {d.options.map((o, i) => (
                <label className="opt" key={i}>
                  <input type="radio" name="opt" checked={q.draft === i} readOnly onClick={() => dispatch({ t: 'select', v: i })} />
                  <span dangerouslySetInnerHTML={{ __html: clean(o) }} />
                </label>
              ))}
            </div>
          </div>
          <button className="collapse" title="Collapse palette" onClick={() => setCollapsed(x => !x)}>{collapsed ? '‹' : '›'}</button>
        </div>

        <aside className="exam-right">
          <div className="profile"><img src="assets/avatar.svg" alt="" /><div className="profile-name">{CONFIG.candidate.name}</div></div>
          <div className="legend">
            <div><Pq s="answered" n={c.answered} /><span className="lbl trunc">Answered</span></div>
            <div><Pq s="notanswered" n={c.notanswered} /><span className="lbl nowrap">Not Answered</span></div>
            <div><Pq s="notvisited" n={c.notvisited} /><span className="lbl">Not Visited</span></div>
            <div><Pq s="marked" n={c.marked} /><span className="lbl">Marked for Review</span></div>
            <div className="wide"><Pq s="ansmarked" n={c.ansmarked} /><span className="lbl">Answered &amp; Marked for Review (will also be evaluated)</span></div>
          </div>
          <div className="pal-head">{sectionName(s.sec)}</div>
          <div className="pal-body">
            <b>Choose a Question</b>
            <div className="palette">
              {s.qs[s.sec].map((x, i) => <Pq key={i} s={status(x)} n={i + 1} current={i === s.cur} onClick={() => dispatch({ t: 'go', i })} />)}
            </div>
          </div>
        </aside>
      </div>

      <div className="actions">
        <div className="actions-left">
          <button className="btn-plain" onClick={() => dispatch({ t: 'save', mark: true })}>Mark for Review &amp; Next</button>
          <button className="btn-plain" onClick={() => dispatch({ t: 'clear' })}>Clear Response</button>
          <span className="grow" />
          <button className="btn-plain" style={{ visibility: s.cur ? 'visible' : 'hidden' }} onClick={() => dispatch({ t: 'go', i: s.cur - 1 })}>Previous</button>
          <button className="btn-blue" onClick={() => dispatch({ t: 'save', mark: false })}>Save &amp; Next</button>
        </div>
        {/* like the real exam, Submit only unlocks in the last section */}
        <div className="actions-right"><button className="btn-submit" disabled={s.sec !== SECS - 1} onClick={() => setModal({ kind: 'submit' })}>Submit</button></div>
      </div>

      {calc && <Calculator x={calc.x} y={calc.y} onClose={() => setCalc(null)} />}
      <Accessibility anchor={access} onClose={() => setAccess(null)} />
      {magnify && <Magnifier />}
      {secInfo && (
        <div className="popover secinfo" style={{ left: secInfo.x, top: secInfo.y }}>
          <h4>{sectionName(secInfo.sec)}</h4>
          {STATUSES.map(([k, l]) => <div key={k}><Pq s={k} n={counts(s.qs[secInfo.sec])[k]} /><span className="l">{l}</span></div>)}
        </div>
      )}
      {preview && <div className="zoom-preview" style={{ left: preview.x, top: preview.y }} dangerouslySetInnerHTML={{ __html: preview.html }} />}
      {modal?.kind === 'img' && <Modal title="" kind="img" onClose={() => setModal(null)}><div dangerouslySetInnerHTML={{ __html: modal.html }} /></Modal>}
      {modal?.kind === 'instr' && (
        <Modal title="Instructions" kind="instr" onClose={() => setModal(null)}>
          <div className="ticking">Note that the timer is ticking. Kindly close this window to attend to the questions.</div>
          <h3>Instructions</h3>
          <div className="instr-body"><Instr1 exam={exam} /><hr /><Instr2 exam={exam} /></div>
        </Modal>
      )}
      {modal?.kind === 'submit' && (
        <Modal title="Exam Summary" kind="confirm" onClose={() => setModal(null)}>
          <SummaryTable qs={s.qs} />
          <p style={{ textAlign: 'center' }}>Are you sure you want to submit for final marking?<br />No changes will be allowed after submission.</p>
          <div className="btns"><button className="btn-blue" onClick={finish}>Yes</button><button className="btn-plain" onClick={() => setModal(null)}>No</button></div>
        </Modal>
      )}
    </section>
  );
}
