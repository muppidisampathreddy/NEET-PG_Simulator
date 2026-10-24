import type { Exam, Question, Result as ResultT } from '../api.ts';
import { counts, sectionName } from '../exam.ts';
import type { QState } from '../exam.ts';
import { clean } from '../sanitize.ts';

export function SummaryTable({ qs }: { qs: QState[][] }) {
  return (
    <table className="sum">
      <thead><tr><th>Section Name</th><th>No. of Questions</th><th>Answered</th><th>Not Answered</th><th>Marked for Review</th><th>Answered &amp; Marked for Review (will also be evaluated)</th><th>Not Visited</th></tr></thead>
      <tbody>{qs.map((sec, i) => {
        const c = counts(sec);
        return <tr key={i}><td>{sectionName(i)}</td><td>{sec.length}</td><td>{c.answered}</td><td>{c.notanswered}</td><td>{c.marked}</td><td>{c.ansmarked}</td><td>{c.notvisited}</td></tr>;
      })}</tbody>
    </table>
  );
}

const TAG = { c: ['c', 'Correct'], w: ['w', 'Wrong'], u: ['u', 'Not attempted'] } as const;

export default function Result({ exam, bySec, qs, result }: { exam: Exam; bySec: Question[][]; qs: QState[][]; result: ResultT }) {
  return (
    <section id="screen-result" className="screen active">
      <div className="topbar"><span className="mock-link">Static Mock Link for {exam.title}</span></div>
      <div className="result">
        <h2>Exam Summary</h2>
        <SummaryTable qs={qs} />
        <h2>Your Score</h2>
        <div className="score">
          <div>Score<b>{result.score} / {result.max_score}</b></div>
          <div>Correct<b>{result.right}</b></div>
          <div>Wrong<b>{result.wrong}</b></div>
          <div>Not attempted<b>{result.unattempted}</b></div>
        </div>
        <p><button className="btn-blue" onClick={() => location.reload()}>Take the test again</button></p>
        <h2>Answer Review</h2>
        {bySec.map((sec, si) => sec.map((d, i) => {
          const a = qs[si][i].saved, key = result.key[d.id];
          const [cls, label] = TAG[a == null ? 'u' : a === key.answer ? 'c' : 'w'];
          return (
            <div className="rev" key={d.id}>
              <div className="qh">{sectionName(si)} · Q{i + 1}<span className={'tag ' + cls}>{label}</span></div>
              <div dangerouslySetInnerHTML={{ __html: clean(d.text) }} />
              {d.image && <img src={d.image} alt="" />}
              {d.options.map((o, k) => (
                <div key={k} className={'o ' + (k === key.answer ? 'right' : k === a ? 'wrong' : '')}>
                  {'ABCD'[k]}. <span dangerouslySetInnerHTML={{ __html: clean(o) }} />
                </div>
              ))}
              {key.explanation && <div className="ex"><b>Explanation:</b> <span dangerouslySetInnerHTML={{ __html: clean(key.explanation) }} /></div>}
            </div>
          );
        }))}
      </div>
    </section>
  );
}
