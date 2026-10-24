import type { ReactNode } from 'react';
import type { Exam } from '../api.ts';
import { CONFIG } from '../config.ts';
import { CalcBody } from './Calculator.tsx';
import Pq from './Pq.tsx';

const perSection = (e: Exam) => (e.question_count % e.sections === 0 ? e.question_count / e.sections : `up to ${Math.ceil(e.question_count / e.sections)}`);

export function Instr1({ exam }: { exam: Exam }) {
  const E = exam.title, S = exam.sections, M = exam.minutes_per_section;
  return (<>
    <h2>Please Read the Instructions Carefully</h2>
    <p className="note"><b>Note:</b> This demo test is only for the purpose of familiarising the applicants with the interface of the {E} computer-based examination. The content of the examination, duration of examination, number of questions in each section and time allotted for each section in the actual examination will be as per the official information bulletin / website notice(s).</p>
    <h4>General Instructions:</h4>
    <ol>
      <li>The total duration of <b>{E}</b> is <b>{S * M}</b> minutes.</li>
      <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the respective section. When the timer reaches zero, the said section will end by itself. You will not be required to end or submit any of your section/examination.</li>
      <li>The Question paper for <b>{E}</b> will be divided into <b>{S}-time bound sections</b> time bound sections. Each section will have <b>{perSection(exam)}</b> questions and <b>{M}</b> minutes of time allotted for the section. Candidates would be restricted to proceed to the next section till completion of the allotted time of the previous section and candidates would not be allowed to review the questions/modify the responses of a section after the completion of the allotted time of that section. Questions of the next section will start automatically after the completion of the allotted time of the previous section. On Completion of the allocated time for the last section, the examination will auto-submit.</li>
      <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
        <ul className="sym">
          <li><Pq s="notvisited" n={1} /> You have not visited the question yet.</li>
          <li><Pq s="notanswered" n={2} /> You have not answered the question.</li>
          <li><Pq s="answered" n={3} /> You have answered the question.</li>
          <li><Pq s="marked" n={4} /> You have NOT answered the question, but have marked the question for review.</li>
          <li><Pq s="ansmarked" n={5} /> The question(s) "Answered and Marked for Review" will be considered for evaluation.</li>
        </ul>
        <span style={{ fontFamily: "'Times New Roman',serif", fontSize: 12 }}>The Marked for Review status for a question simply indicates that you would like to look at that question again.</span></li>
      <li>Normal calculator is available to use.<div className="calc-shot"><div className="calc"><CalcBody /></div></div></li>
      <li>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on "&lt;" which appears on the right side of question window.</li>
      <li>You can click on <span className="roundico">&#8595;</span> to navigate to the bottom and <span className="roundico">&#8593;</span> to navigate to the top of the question area, without scrolling.</li>
    </ol>
    <h4 className="serif">Navigating to a Question:</h4>
    <ol start={8}><li>To navigate to a question, do the following:<ol>
      <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
      <li>Click on <b>Save &amp; Next</b> to save your answer for the current question and then go to the next question.</li>
      <li>Alternatively, Click on the <b>Mark for Review &amp; Next</b> button to save your answer, mark the question for review and to go to the next question.</li></ol></li></ol>
    <h4 className="serif">Answering a Question :</h4>
    <ol start={9}><li>Procedure for answering a multiple-choice type question:<ol>
      <li>To select your answer, click on the button of one of the options.</li>
      <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <b>Clear Response</b> button.</li>
      <li>To change your chosen answer, click on the button of another option.</li>
      <li>To save your answer, click on the <b>Save &amp; Next</b> button.</li>
      <li>Alternatively, click on the <b>Mark for Review &amp; Next</b> button to save your answer and also to mark the question for review.</li></ol></li>
      <li>The questions <b>Answered and Marked for Review</b> shall also be considered for evaluation as per the marking scheme.</li></ol>
    <h4 className="serif">Navigating through Sections:</h4>
    <ol start={11}>
      <li>Sections in this question paper are displayed on the top bar of the screen. The section you are currently viewing is highlighted.</li>
      <li>You cannot navigate between sections anytime during the exam by clicking the concerned icon on the left upper side of the computer screen. There is individual time limit for each section.</li>
      <li>Candidate can view the corresponding section summary as part of the legend that appears above the question palette.</li></ol>
    <p style={{ textAlign: 'center' }}><b>*****</b></p>
  </>);
}

export function Instr2({ exam }: { exam: Exam }) {
  const S = exam.sections, M = exam.minutes_per_section, N = exam.question_count;
  const rows: [ReactNode, ReactNode][] = [
    ['Name of the Exam', exam.title], ['Total number of questions', N], ['Number of time-bound sections', S],
    ['Number of Questions in a section', perSection(exam)], [<>Total Time allocated for examination<br />(In minutes)</>, S * M],
    [<>Time allocated for each section<br />(In minutes)</>, M], ['Marks awarded for Correct response', exam.marks_correct],
    ['Marks deducted for Incorrect response', exam.marks_wrong], ['Marks awarded for Unattempted questions', 0],
  ];
  return (<>
    <div className="subj-title">Subject Specific Instructions</div>
    <table className="subj"><tbody>{rows.map((r, i) => <tr key={i}><td>{r[0]}</td><td>{r[1]}</td></tr>)}</tbody></table>
    <ol>
      <li>There are <b>{N}</b> multiple choice questions with each question having <b>4</b> response options or distractors. You are required to select the correct/best/most appropriate response or answer out of the <b>4</b> response options provided in each question.</li>
      <li>For every question answered correctly, you will get <b>{exam.marks_correct}</b> marks. <b>{exam.marks_wrong}</b> mark will be deducted for an incorrect answer. Unattempted questions will fetch <b>0</b> marks.</li>
      <li>Please maintain total silence and discipline during the examination.</li>
      <li>Use of any unfair means or improper conduct shall be attended to as per the Unfair Means Guidelines of the examining body and may lead to debarment of the candidate from appearing in the examination. This may also force appropriate legal/criminal action against him/her.</li>
      <li>Use of all electronic devices, including cell phones, pagers, calculators, pen drives, tablets, is strictly prohibited at the examination venue. You must not be carrying pens and pencils.</li>
      <li>To check against possible impersonation, authorities will be verifying the identity and genuineness of a candidate by taking their thumb impression, photograph or by any other means at the examination center, as may deem fit.</li>
      <li>Should a candidate have any queries/doubts, he/she may please call for the invigilator by raising his/her hand.</li>
      <li>The candidate is not permitted to make an early exit from the examination center.</li>
      <li>Each candidate must follow instructions given on the computer screen while taking the examination.</li>
      <li>Since taking the examination does not require a regular keyboard, it has been disabled. Should a keyboard be required at any point, a virtual keyboard will appear automatically on the computer screen.</li>
    </ol>
  </>);
}

function Side() {
  return <aside className="instr-side"><div className="side-strip" /><img src="assets/avatar.svg" alt="" /><div className="side-name">{CONFIG.candidate.name}</div></aside>;
}

export function InstructionsPage({ exam, onNext }: { exam: Exam; onNext: () => void }) {
  return (
    <section className="screen active instr-screen">
      <div className="instr-main">
        <div className="instr-title">Instructions</div>
        <div className="instr-body"><Instr1 exam={exam} /></div>
        <div className="instr-foot p1"><span /><button className="btn-plain" onClick={onNext}>Next <span className="chev">&#8250;</span></button></div>
      </div>
      <Side />
    </section>
  );
}

export function OtherInstructionsPage({ exam, onBack, onBegin, agreed, setAgreed }:
  { exam: Exam; onBack: () => void; onBegin: () => void; agreed: boolean; setAgreed: (v: boolean) => void }) {
  return (
    <section className="screen active instr-screen">
      <div className="instr-main">
        <div className="instr-title">Other Important Instructions</div>
        <div className="instr-body"><Instr2 exam={exam} /></div>
        <div className="nda">
          <label><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /> <span className="nda-title">Non-Disclosure Agreement (NDA)</span> <b>{exam.title}:</b></label>
          <div className="nda-sub">I agree that:</div>
          <p><b>1.1:</b> The <b>{exam.title}</b> mock is a practice simulator. The questions in this simulator are sample questions published by the administrator of this site for practice; they are not taken from any actual examination. Do not use this simulator to reproduce or distribute confidential examination content. <b>Real examination content is confidential and proprietary to the conducting body.</b></p>
        </div>
        <div className="instr-foot p2">
          <button className="btn-plain" onClick={onBack}><span className="chev">&#8249;</span> Previous</button>
          <button className="btn-begin" disabled={!agreed} onClick={onBegin}>I am ready to begin</button>
          <span />
        </div>
      </div>
      <Side />
    </section>
  );
}
