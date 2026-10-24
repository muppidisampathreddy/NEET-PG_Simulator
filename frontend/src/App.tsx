import { useEffect, useRef, useState } from 'react';
import { api } from './api.ts';
import type { Exam as ExamT, Question, Result as ResultT } from './api.ts';
import Admin from './components/Admin.tsx';
import Exam from './components/Exam.tsx';
import { InstructionsPage, OtherInstructionsPage } from './components/Instructions.tsx';
import Login from './components/Login.tsx';
import Result from './components/Result.tsx';
import { CONFIG } from './config.ts';
import type { QState } from './exam.ts';

type Screen = 'login' | 'pick' | 'instr1' | 'instr2' | 'exam' | 'result';

function Banner() {
  return (
    <header className="banner">
      <div className="banner-art">
        <img className="emblem" src="assets/emblem.svg" alt="" />
        <div className="banner-text">
          <div className="b1">राष्ट्रीय पात्रता सह प्रवेश परीक्षा — अभ्यास</div>
          <div className="b2">NEET-PG Mock Test Simulator</div>
          <div className="b3">(Open-source practice interface · Not affiliated with NBEMS)</div>
        </div>
        <div className="badges"><span>CBT</span><span>MOCK</span></div>
      </div>
      <div className="banner-blank" />
    </header>
  );
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(location.hash.startsWith('#/admin'));
  useEffect(() => {
    const h = () => setIsAdmin(location.hash.startsWith('#/admin'));
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);

  return (
    <div id="app">
      <Banner />
      {isAdmin ? <Admin /> : <Student />}
      <footer className="version">Version : {CONFIG.version}</footer>
    </div>
  );
}

function Student() {
  const [screen, setScreen] = useState<Screen>('login');
  const [exams, setExams] = useState<ExamT[] | null>(null);
  const [error, setError] = useState('');
  const [exam, setExam] = useState<ExamT | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [final, setFinal] = useState<{ qs: QState[][]; result: ResultT } | null>(null);
  const pending = useRef<QState[][] | null>(null); // kept so a failed submit can be retried

  useEffect(() => { api.exams().then(setExams, e => setError(String(e.message))); }, []);

  const open = (id: number) => api.exam(id).then(e => { setExam(e); setScreen('instr1'); }, e => setError(e.message));
  const bySec: Question[][] = exam ? Array.from({ length: exam.sections }, (_, s) => exam.questions!.filter(q => q.section === s)) : [];

  const finish = (qs: QState[][]) => {
    pending.current = qs;
    setError('');
    const answers: Record<number, number | null> = {};
    bySec.forEach((sec, si) => sec.forEach((q, i) => { answers[q.id] = qs[si][i].saved; }));
    api.submit(exam!.id, answers).then(result => { setFinal({ qs, result }); setScreen('result'); }, e => setError(e.message));
  };

  if (screen === 'login') {
    return <Login error={error} ready={!!exams} onSignIn={() => {
      if (!exams!.length) return setError('No mock test has been published yet. Ask the admin to publish one.');
      if (exams!.length === 1) open(exams![0].id); else setScreen('pick');
    }} />;
  }
  if (screen === 'pick') {
    return (
      <section className="screen active instr-screen">
        <div className="instr-main">
          <div className="instr-title">Available Mock Tests</div>
          <div className="instr-body">
            <table className="sum pick">
              <thead><tr><th>Mock Test</th><th>Sections</th><th>Questions</th><th>Duration</th><th /></tr></thead>
              <tbody>{exams!.map(e => (
                <tr key={e.id}><td>{e.title}</td><td>{e.sections}</td><td>{e.question_count}</td><td>{e.sections * e.minutes_per_section} min</td>
                  <td><button className="btn-blue" onClick={() => open(e.id)}>Start</button></td></tr>
              ))}</tbody>
            </table>
            {error && <p className="err">{error}</p>}
          </div>
        </div>
      </section>
    );
  }
  if (screen === 'instr1') return <InstructionsPage exam={exam!} onNext={() => setScreen('instr2')} />;
  if (screen === 'instr2') return <OtherInstructionsPage exam={exam!} agreed={agreed} setAgreed={setAgreed} onBack={() => setScreen('instr1')} onBegin={() => setScreen('exam')} />;
  if (screen === 'exam') return <>{error && pending.current && <div className="err bar">Submit failed: {error} <button onClick={() => finish(pending.current!)}>Retry</button></div>}<Exam exam={exam!} bySec={bySec} onFinish={finish} /></>;
  return <Result exam={exam!} bySec={bySec} qs={final!.qs} result={final!.result} />;
}
