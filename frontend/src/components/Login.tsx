import { CONFIG } from '../config.ts';

export default function Login({ onSignIn, error, ready }: { onSignIn: () => void; error: string; ready: boolean }) {
  const c = CONFIG.candidate;
  return (
    <section id="screen-login" className="screen active">
      <div className="login-strip">
        <div>
          <div className="ls-label">System Name :</div>
          <div className="ls-system">{c.system}</div>
          <div className="ls-note">Kindly contact the invigilator if there are any discrepancies in the Name and Photograph displayed on the screen or if the photograph is not yours</div>
        </div>
        <div className="ls-right">
          <div className="ls-label">Candidate Name :</div>
          <div className="ls-name">{c.name}</div>
          <div className="ls-label">Subject : <span className="ls-subject">Mock Exam</span></div>
        </div>
        <div className="ls-photo"><img src="assets/avatar.svg" alt="Candidate photo" /></div>
      </div>
      <form className="login-box" onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (String(f.get('user')).trim() && f.get('pass')) onSignIn();
      }}>
        <div className="login-head">Login</div>
        <div className="login-body">
          <label className="lf"><span className="lf-icon">&#128100;</span><input name="user" defaultValue={c.roll} aria-label="Roll number" autoComplete="off" /><span className="lf-kb">&#9000;</span></label>
          <label className="lf"><span className="lf-icon">&#128274;</span><input name="pass" type="password" defaultValue={c.password} aria-label="Password" /><span className="lf-kb">&#9000;</span></label>
          <button className="btn-signin" type="submit" disabled={!ready}>{ready ? 'Sign In' : 'Loading…'}</button>
          {error && <p className="err">{error}</p>}
        </div>
      </form>
    </section>
  );
}
