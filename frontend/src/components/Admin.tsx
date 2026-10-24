import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { adminApi, api } from '../api.ts';
import type { Exam, ExamSettings, Question } from '../api.ts';
import { sectionName } from '../exam.ts';
import { clean } from '../sanitize.ts';

const KEY = 'neetpg-admin-key';
const read = (k: string) => { try { return sessionStorage.getItem(k) ?? ''; } catch { return ''; } };
const write = (k: string, v: string) => { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch { /* storage blocked */ } };

export default function Admin() {
  const [key, setKey] = useState(read(KEY));
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null);
  const a = adminApi(key);

  const refresh = () => a.list().then(setExams, e => { setError(e.message); if (e.message.includes('admin password')) logout(); });
  useEffect(() => { if (key) refresh(); else api.setupNeeded().then(setSetupNeeded, e => setError(e.message)); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const logout = () => { write(KEY, ''); setKey(''); setExams(null); };
  const signIn = (k: string) => { write(KEY, k); setError(''); setKey(k); };

  if (!key) {
    return (
      <section className="screen active admin-screen">
        <form className="login-box" onSubmit={e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const k = String(f.get('key'));
          if (!setupNeeded) return signIn(k);
          if (k !== f.get('confirm')) return setError('Passwords do not match');
          api.setup(k).then(() => signIn(k), err => setError(err.message));
        }}>
          <div className="login-head">{setupNeeded ? 'Create Admin Password' : 'Admin Login'}</div>
          <div className="login-body">
            {setupNeeded && <p className="hint">First time here. Choose the password you will use to manage exams.</p>}
            <label className="lf"><span className="lf-icon">&#128274;</span><input name="key" type="password" placeholder="Admin password" aria-label="Admin password" minLength={setupNeeded ? 6 : undefined} required autoFocus /></label>
            {setupNeeded && <label className="lf"><span className="lf-icon">&#128274;</span><input name="confirm" type="password" placeholder="Confirm password" aria-label="Confirm password" required /></label>}
            <button className="btn-signin" type="submit" disabled={setupNeeded === null}>{setupNeeded ? 'Set Password' : 'Sign In'}</button>
            {error && <p className="err">{error}</p>}
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="screen active admin-screen">
      <div className="topbar">
        <span className="mock-link">Admin Panel</span>
        <span className="top-links"><button onClick={() => { location.hash = ''; }}>Student view</button><button onClick={logout}>Log out</button></span>
      </div>
      <div className="admin">
        <aside className="admin-list">
          <h3>Mock Exams</h3>
          <NewExam onCreate={body => a.create(body).then(e => { refresh(); setSelected(e.id); }, e => setError(e.message))} />
          {exams?.map(e => (
            <button key={e.id} className={'admin-exam' + (e.id === selected ? ' sel' : '')} onClick={() => { setError(''); setSelected(e.id); }}>
              <b>{e.title}</b>
              <span>{e.question_count} questions · {e.sections} sections</span>
              <span className={'badge ' + (e.published ? 'pub' : 'draft')}>{e.published ? 'Published' : 'Draft'}</span>
            </button>
          ))}
        </aside>
        <main className="admin-main">
          {error && <div className="err bar">{error} <button onClick={() => setError('')}>&#10006;</button></div>}
          {selected
            ? <ExamEditor key={selected} id={selected} api={a} onChange={refresh} onDeleted={() => { setSelected(null); refresh(); }} onError={setError} />
            : <p className="hint">Select an exam on the left, or create a new one. Add questions to every section, then click <b>Publish</b> so students can take it.</p>}
        </main>
      </div>
    </section>
  );
}

function NewExam({ onCreate }: { onCreate: (b: ExamSettings) => void }) {
  return (
    <form className="new-exam" onSubmit={e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      onCreate({ title: String(f.get('title')), sections: +f.get('sections')!, minutes_per_section: +f.get('minutes')!, marks_correct: 4, marks_wrong: 1 });
      e.currentTarget.reset();
    }}>
      <input name="title" placeholder="New exam title" required />
      <div className="row">
        <label>Sections <input name="sections" type="number" min={1} max={26} defaultValue={5} /></label>
        <label>Min/section <input name="minutes" type="number" min={1} max={300} defaultValue={42} /></label>
      </div>
      <button className="btn-blue">+ Create exam</button>
    </form>
  );
}

type Api = ReturnType<typeof adminApi>;

function ExamEditor({ id, api, onChange, onDeleted, onError }: { id: number; api: Api; onChange: () => void; onDeleted: () => void; onError: (m: string) => void }) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [sec, setSec] = useState(0);
  const [editing, setEditing] = useState<Question | 'new' | null>(null);
  const load = () => api.get(id).then(setExam, e => onError(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!exam) return <p className="hint">Loading…</p>;

  const fail = (e: Error) => onError(e.message);
  const after = () => { onError(''); load(); onChange(); };
  const saveSettings = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    api.update(id, { title: String(f.get('title')), sections: +f.get('sections')!, minutes_per_section: +f.get('minutes')!, marks_correct: +f.get('plus')!, marks_wrong: +f.get('minus')! }).then(after, fail);
  };
  const qs = exam.questions!.filter(q => q.section === sec);

  return (
    <div>
      <form className="exam-settings" onSubmit={saveSettings} key={JSON.stringify(exam)}>
        <label className="grow">Title <input name="title" defaultValue={exam.title} required /></label>
        <label>Sections <input name="sections" type="number" min={1} max={26} defaultValue={exam.sections} /></label>
        <label>Min/section <input name="minutes" type="number" min={1} max={300} defaultValue={exam.minutes_per_section} /></label>
        <label>+ marks <input name="plus" type="number" min={0} defaultValue={exam.marks_correct} /></label>
        <label>− marks <input name="minus" type="number" min={0} defaultValue={exam.marks_wrong} /></label>
        <button className="btn-plain">Save settings</button>
      </form>
      <div className="publish-row">
        <span className={'badge ' + (exam.published ? 'pub' : 'draft')}>{exam.published ? 'Published: students can take this exam' : 'Draft: students cannot see this exam'}</span>
        <span className="grow" />
        <button className={exam.published ? 'btn-plain' : 'btn-blue'} onClick={() => api.update(id, { published: !exam.published }).then(after, fail)}>{exam.published ? 'Unpublish' : 'Publish'}</button>
        <button className="btn-plain danger" onClick={() => { if (confirm(`Delete "${exam.title}" and all its questions?`)) api.remove(id).then(onDeleted, fail); }}>Delete exam</button>
      </div>

      <div className="tabs admin-tabs">
        {Array.from({ length: exam.sections }, (_, i) => {
          const n = exam.questions!.filter(q => q.section === i).length;
          return <button key={i} className={'tab' + (i === sec ? ' active' : '')} onClick={() => { setSec(i); setEditing(null); }}>{sectionName(i)} ({n})</button>;
        })}
      </div>

      {qs.map((q, i) => editing !== 'new' && editing?.id === q.id
        ? <QuestionForm key={q.id} sections={exam.sections} q={q} onCancel={() => setEditing(null)}
            onSave={f => api.updateQuestion(q.id, f).then(() => { setEditing(null); after(); }, fail)} />
        : (
          <div className="admin-q" key={q.id}>
            <div className="qn">Q{i + 1}</div>
            <div className="grow">
              <div dangerouslySetInnerHTML={{ __html: clean(q.text) }} />
              {q.image && <img src={q.image} alt="" />}
              <ol type="A">{q.options.map((o, k) => <li key={k} className={k === q.answer ? 'right' : ''} dangerouslySetInnerHTML={{ __html: clean(o) }} />)}</ol>
            </div>
            <div className="acts">
              <button className="btn-plain" onClick={() => setEditing(q)}>Edit</button>
              <button className="btn-plain danger" onClick={() => { if (confirm('Delete this question?')) api.removeQuestion(q.id).then(after, fail); }}>Delete</button>
            </div>
          </div>
        ))}
      {editing === 'new'
        ? <QuestionForm sections={exam.sections} section={sec} onCancel={() => setEditing(null)}
            onSave={f => api.addQuestion(id, f).then(() => { setEditing(null); after(); }, fail)} />
        : <button className="btn-blue add-q" onClick={() => setEditing('new')}>+ Add question to {sectionName(sec)}</button>}
    </div>
  );
}

function QuestionForm({ q, sections, section = q?.section ?? 0, onSave, onCancel }:
  { q?: Question; sections: number; section?: number; onSave: (f: FormData) => void; onCancel: () => void }) {
  const [preview, setPreview] = useState<string | null>(q?.image ?? null);
  const [removed, setRemoved] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  // braces matter: Chrome's scrollIntoView now returns a Promise, and an effect must not return one
  useEffect(() => { ref.current!.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, []);
  return (
    <form ref={ref} className="q-form" onSubmit={e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      if ((f.get('image') as File)?.size === 0) f.delete('image');
      if (removed) f.set('remove_image', 'true');
      onSave(f);
    }}>
      <h4>{q ? 'Edit question' : 'New question'}</h4>
      <label>Section
        <select name="section" defaultValue={section}>{Array.from({ length: sections }, (_, i) => <option key={i} value={i}>{sectionName(i)}</option>)}</select>
      </label>
      <label>Question text <small>(HTML allowed, e.g. &lt;b&gt;, &lt;sub&gt;, &lt;table class="match"&gt;)</small>
        <textarea name="text" rows={4} defaultValue={q?.text} required />
      </label>
      <label>Image <small>(optional · PNG, JPEG, GIF or WebP, up to 5 MB)</small>
        <input name="image" type="file" accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={e => { const file = e.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : null); setRemoved(false); }} />
      </label>
      {preview && !removed && <div className="img-prev"><img src={preview} alt="Preview" />{q?.image && <button type="button" className="btn-plain" onClick={() => setRemoved(true)}>Remove image</button>}</div>}
      <fieldset>
        <legend>Options: select the correct one</legend>
        {[0, 1, 2, 3].map(i => (
          <label key={i} className="opt-row">
            <input type="radio" name="answer" value={i} defaultChecked={(q?.answer ?? 0) === i} required />
            <b>{'ABCD'[i]}</b>
            <input name="options" defaultValue={q?.options[i]} placeholder={`Option ${'ABCD'[i]}`} required />
          </label>
        ))}
      </fieldset>
      <label>Explanation <small>(shown to students after they submit)</small>
        <textarea name="explanation" rows={2} defaultValue={q?.explanation} />
      </label>
      <div className="q-form-btns"><button className="btn-blue">Save question</button><button type="button" className="btn-plain" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}
