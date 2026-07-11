'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './learning.module.css';

type StudentId = 'jenna' | 'sophia';
type Subject = 'Math' | 'Reading' | 'Science';
type Assignment = {
  id: string; subject: Subject; title: string; description: string; date: string;
  minutes: number; skill: string; reading?: string; question: string;
  answers: string[]; correct: number; explanation: string;
};
type StudentProgress = { completed: string[]; scores: Record<string, boolean>; streak: number };

const students = {
  jenna: { name: 'Jenna', initial: 'J', color: '#7968e8', soft: '#eeebff' },
  sophia: { name: 'Sophia', initial: 'S', color: '#ed6d9b', soft: '#fff0f5' },
};

const assignments: Assignment[] = [
  { id:'fractions-1', subject:'Math', title:'Fraction Foundations', description:'Explore equal parts and compare simple fractions.', date:'Today', minutes:30, skill:'Fractions', question:'Which fraction is the same as one half?', answers:['1/3','2/4','3/4','2/3'], correct:1, explanation:'Two out of four equal pieces is the same amount as one out of two equal pieces. Both represent half of a whole.' },
  { id:'reading-1', subject:'Reading', title:'The Secret Garden Path', description:'Read a short story and use details to make an inference.', date:'Yesterday', minutes:30, skill:'Reading comprehension', reading:'Maya stopped at the old garden gate. The path beyond it was covered in fresh footprints, even though snow had fallen all night. A warm yellow light flickered between the trees. She tightened her scarf, took one careful step forward, and smiled.', question:'What can you infer about Maya?', answers:['She is too frightened to continue.','She is curious about what is beyond the gate.','She has been lost all night.','She wants to go home immediately.'], correct:1, explanation:'Maya moves forward and smiles even though the path is mysterious. Those details show that she is curious and willing to explore.' },
  { id:'science-1', subject:'Science', title:'Energy All Around Us', description:'Discover how energy changes from one form to another.', date:'Monday', minutes:25, skill:'Energy', question:'A lamp changes electrical energy mostly into which forms?', answers:['Light and heat','Sound and motion','Chemical and sound','Motion and light'], correct:0, explanation:'A lamp uses electrical energy and changes it into light. It also gives off some heat.' },
];

const emptyProgress = (): StudentProgress => ({ completed: [], scores: {}, streak: 3 });

export default function LearningPage() {
  const [student, setStudent] = useState<StudentId | null>(null);
  const [progress, setProgress] = useState<Record<StudentId, StudentProgress>>({ jenna: emptyProgress(), sophia: emptyProgress() });
  const [active, setActive] = useState<Assignment | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const saved = localStorage.getItem('brightpath-progress'); if (saved) setProgress(JSON.parse(saved)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem('brightpath-progress', JSON.stringify(progress)); }, [progress, ready]);

  const current = student ? students[student] : null;
  const studentProgress = student ? progress[student] : emptyProgress();
  const pending = assignments.filter(a => !studentProgress.completed.includes(a.id));
  const completed = assignments.filter(a => studentProgress.completed.includes(a.id));
  const accuracy = completed.length ? Math.round(completed.filter(a => studentProgress.scores[a.id]).length / completed.length * 100) : 0;
  const strengths = useMemo(() => completed.filter(a => studentProgress.scores[a.id]).map(a => a.skill).slice(-2), [completed, studentProgress.scores]);

  function openLesson(a: Assignment) { setActive(a); setAnswer(null); setChecked(false); }
  function finishLesson() {
    if (!student || !active || answer === null) return;
    const correct = answer === active.correct;
    setProgress(old => ({ ...old, [student]: { ...old[student], completed: [...new Set([...old[student].completed, active.id])], scores: { ...old[student].scores, [active.id]: correct }, streak: old[student].streak + 1 } }));
    setActive(null); setChecked(false); setAnswer(null);
  }

  if (!student) return (
    <main className={styles.welcome}>
      <div className={styles.cloudOne} /><div className={styles.cloudTwo} />
      <section className={styles.welcomeCard}>
        <div className={styles.logo}><span>✦</span> BrightPath</div>
        <div className={styles.heroIcon}>☀</div>
        <p className={styles.eyebrow}>YOUR LEARNING ADVENTURE</p>
        <h1>Who&apos;s learning today?</h1>
        <p className={styles.lead}>Choose your name to see today&apos;s personalized learning path.</p>
        <div className={styles.studentGrid}>
          {(Object.keys(students) as StudentId[]).map(id => <button key={id} className={styles.studentCard} onClick={() => setStudent(id)} style={{'--student':students[id].color,'--soft':students[id].soft} as React.CSSProperties}>
            <span className={styles.avatar}>{students[id].initial}</span><strong>{students[id].name}</strong><small>Continue learning <span>→</span></small>
          </button>)}
        </div>
        <p className={styles.parentLink}>Grown-up? <button>View parent dashboard</button></p>
      </section>
    </main>
  );

  return <main className={styles.app}>
    <header className={styles.header}><div className={styles.logo}><span>✦</span> BrightPath</div><div className={styles.headerActions}><button className={styles.iconButton} aria-label="Notifications">🔔</button><button className={styles.profile} onClick={() => setStudent(null)} style={{'--student':current!.color} as React.CSSProperties}><span>{current!.initial}</span><b>{current!.name}</b><small>⌄</small></button></div></header>
    <div className={styles.shell}>
      <aside className={styles.sidebar}><nav><a className={styles.activeNav}>⌂ <span>My Learning</span></a><a>▥ <span>Progress</span></a><a>★ <span>Achievements</span></a></nav><div className={styles.sideTip}><span>💡</span><b>Keep it up!</b><p>A little practice every day makes your brain stronger.</p></div></aside>
      <section className={styles.content}>
        <div className={styles.greeting}><div><p>GOOD {new Date().getHours() < 12 ? 'MORNING' : 'AFTERNOON'}, {current!.name.toUpperCase()}!</p><h1>Ready to grow your brain?</h1><span>You have {pending.length} learning {pending.length === 1 ? 'adventure' : 'adventures'} waiting for you.</span></div><div className={styles.streak}>🔥 <div><b>{studentProgress.streak} day streak</b><small>You&apos;re on a roll!</small></div></div></div>
        <div className={styles.sectionTitle}><div><h2>Up next</h2><p>Your lessons stay here until you finish them.</p></div><span>{pending.length} TO DO</span></div>
        <div className={styles.assignmentList}>
          {pending.length === 0 ? <div className={styles.allDone}><span>🎉</span><h3>All caught up!</h3><p>Your next personalized lesson will be ready tomorrow.</p></div> : pending.map((a,i) => <article className={styles.assignment} key={a.id}>
            <div className={`${styles.subjectIcon} ${styles[a.subject.toLowerCase()]}`}>{a.subject === 'Math' ? '➗' : a.subject === 'Reading' ? '📖' : '⚗'}</div>
            <div className={styles.assignmentInfo}><div><span className={`${styles.pill} ${styles[a.subject.toLowerCase()]}`}>{a.subject}</span>{i === 0 && <span className={styles.today}>TODAY&apos;S PICK</span>}</div><h3>{a.title}</h3><p>{a.description}</p><small>◷ {a.minutes} min&nbsp;&nbsp; · &nbsp;&nbsp;{a.date}</small></div>
            <button className={styles.startButton} onClick={() => openLesson(a)}>{i === 0 ? 'Start lesson' : 'Continue'} <span>→</span></button>
          </article>)}
        </div>
        <div className={styles.progressGrid}><article><div className={styles.progressTop}><div><p>THIS WEEK</p><h3>Your progress</h3></div><span>{completed.length} of {assignments.length}</span></div><div className={styles.progressBar}><i style={{width:`${completed.length / assignments.length * 100}%`}} /></div><small>{completed.length === assignments.length ? 'Amazing — you finished everything!' : `${assignments.length - completed.length} more lesson${assignments.length - completed.length === 1 ? '' : 's'} to reach your weekly goal`}</small></article><article><span className={styles.spark}>✦</span><div><p>LEARNING INSIGHT</p><h3>{strengths.length ? `You're growing in ${strengths.join(' and ')}!` : 'Your learning path is getting ready'}</h3><small>{completed.length ? `${accuracy}% accuracy so far. Your next lesson will practice what helps you most.` : 'Finish a lesson and BrightPath will begin adapting to you.'}</small></div></article></div>
      </section>
    </div>
    {active && <div className={styles.modalBackdrop}><section className={styles.lessonModal}>
      <button className={styles.close} onClick={() => setActive(null)}>×</button><span className={`${styles.pill} ${styles[active.subject.toLowerCase()]}`}>{active.subject} · {active.minutes} min</span><h2>{active.title}</h2><p className={styles.lessonIntro}>Let&apos;s learn one step at a time. Read carefully, then choose your answer.</p>
      {active.reading && <div className={styles.reading}><b>Read this passage</b><p>{active.reading}</p></div>}
      <div className={styles.question}><p>CHECK YOUR UNDERSTANDING</p><h3>{active.question}</h3><div className={styles.answers}>{active.answers.map((option,i) => <button key={option} disabled={checked} onClick={() => setAnswer(i)} className={`${answer === i ? styles.selectedAnswer : ''} ${checked && i === active.correct ? styles.correctAnswer : ''} ${checked && answer === i && i !== active.correct ? styles.wrongAnswer : ''}`}><span>{String.fromCharCode(65+i)}</span>{option}</button>)}</div></div>
      {checked && <div className={answer === active.correct ? styles.goodFeedback : styles.tryFeedback}><b>{answer === active.correct ? '✓ You got it!' : 'Let’s learn from that one.'}</b><p>{active.explanation}</p>{answer !== active.correct && <small>Your next lesson will include a little more practice with {active.skill.toLowerCase()}.</small>}</div>}
      <div className={styles.lessonFooter}><button className={styles.helpButton} onClick={() => setChecked(true)} disabled={answer === null}>💡 Explain it to me</button>{!checked ? <button className={styles.checkButton} disabled={answer === null} onClick={() => setChecked(true)}>Check my answer</button> : <button className={styles.checkButton} onClick={finishLesson}>Finish lesson →</button>}</div>
    </section></div>}
  </main>;
}
