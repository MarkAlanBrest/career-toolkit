'use client';

import { useMemo, useState } from 'react';
import styles from './drive-profile.module.css';
import {
  STYLES,
  STYLE_ORDER,
  QUESTIONS,
  scoreAnswers,
  blendInsight,
  type StyleKey,
  type ScoreResult,
} from './data';

type Phase = 'intro' | 'quiz' | 'results';
type Answer = { most?: StyleKey; least?: StyleKey };

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const display = 'Georgia, "Times New Roman", serif';

export default function DriveProfilePage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});

  const question = QUESTIONS[qIndex];
  const current = answers[question?.id] || {};

  function pick(role: 'most' | 'least', style: StyleKey) {
    setAnswers(prev => {
      const existing = { ...(prev[question.id] || {}) };
      if (role === 'most') {
        existing.most = style;
        if (existing.least === style) existing.least = undefined;
      } else {
        existing.least = style;
        if (existing.most === style) existing.most = undefined;
      }
      return { ...prev, [question.id]: existing };
    });
  }

  function goNext() {
    if (qIndex < QUESTIONS.length - 1) setQIndex(qIndex + 1);
    else setPhase('results');
  }
  function goBack() {
    if (qIndex > 0) setQIndex(qIndex - 1);
  }
  function restart() {
    setAnswers({});
    setQIndex(0);
    setPhase('intro');
  }

  const canAdvance = !!(current.most && current.least);

  const result: ScoreResult | null = useMemo(() => {
    if (phase !== 'results') return null;
    return scoreAnswers(answers as Record<number, { most: StyleKey; least: StyleKey }>);
  }, [phase, answers]);

  return (
    <div style={{ minHeight: '100vh', fontFamily: font, background: '#0F172A' }}>
      {phase === 'intro' && <IntroScreen onStart={() => setPhase('quiz')} />}
      {phase === 'quiz' && (
        <QuizScreen
          question={question}
          index={qIndex}
          total={QUESTIONS.length}
          current={current}
          onPick={pick}
          onNext={goNext}
          onBack={goBack}
          canAdvance={canAdvance}
        />
      )}
      {phase === 'results' && result && <ResultsScreen result={result} onRestart={restart} />}
    </div>
  );
}

// ───────────────────────── Intro ─────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div
      className={styles.animatedGradient}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#7C3AED,#DB2777,#F97316,#7C3AED)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        className={styles.fadeUp}
        style={{
          maxWidth: 640,
          width: '100%',
          background: 'rgba(15,23,42,0.55)',
          backdropFilter: 'blur(10px)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '48px 40px',
          textAlign: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 6 }}>🔥🌟🌿🧭</div>
        <h1 style={{ fontFamily: display, color: '#fff', fontSize: 'clamp(30px,5vw,42px)', margin: '4px 0 10px', fontWeight: 700 }}>
          Drive Profile
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.7, margin: '0 0 28px' }}>
          Discover what actually motivates you — and get a detailed, personal playbook for making it work,
          at work and everywhere else.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 30 }}>
          {STYLE_ORDER.map(key => (
            <div
              key={key}
              style={{
                background: STYLES[key].colorSoft,
                color: '#111827',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 16 }}>{STYLES[key].emoji}</span> {STYLES[key].label}
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          style={{
            background: '#fff',
            color: '#1E1B4B',
            border: 'none',
            borderRadius: 999,
            padding: '16px 36px',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
        >
          Start My Profile →
        </button>
        <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.6)', fontSize: 12.5 }}>
          {QUESTIONS.length} quick questions · about 5 minutes · nothing saved, nothing to sign up for
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Quiz ─────────────────────────

function QuizScreen({
  question,
  index,
  total,
  current,
  onPick,
  onNext,
  onBack,
  canAdvance,
}: {
  question: (typeof QUESTIONS)[number];
  index: number;
  total: number;
  current: Answer;
  onPick: (role: 'most' | 'least', style: StyleKey) => void;
  onNext: () => void;
  onBack: () => void;
  canAdvance: boolean;
}) {
  const progressPct = Math.round((index / total) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: 620, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
          <span>Question {index + 1} of {total}</span>
          <span>{progressPct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: '#1E293B', overflow: 'hidden', marginBottom: 32 }}>
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg,#7C3AED,#EC4899,#F97316)',
              borderRadius: 999,
              transition: 'width 0.35s ease',
            }}
          />
        </div>

        <div key={question.id} className={styles.fadeUp}>
          <h2 style={{ fontFamily: display, color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>
            {question.prompt}
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 13, margin: '0 0 22px' }}>
            Mark ONE option <strong style={{ color: '#4ADE80' }}>Most</strong> like you and ONE{' '}
            <strong style={{ color: '#F87171' }}>Least</strong> like you.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {question.options.map(opt => {
              const isMost = current.most === opt.style;
              const isLeast = current.least === opt.style;
              return (
                <div
                  key={opt.style}
                  className={styles.optionCard}
                  style={{
                    background: isMost ? 'rgba(74,222,128,0.1)' : isLeast ? 'rgba(248,113,113,0.1)' : '#1E293B',
                    border: `1.5px solid ${isMost ? '#4ADE80' : isLeast ? '#F87171' : '#334155'}`,
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ color: '#F1F5F9', fontSize: 14.5, flex: 1, minWidth: 180 }}>{opt.text}</div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => onPick('most', opt.style)}
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: '7px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isMost ? '#22C55E' : '#334155',
                        color: isMost ? '#052E16' : '#CBD5E1',
                      }}
                    >
                      ✓ Most
                    </button>
                    <button
                      onClick={() => onPick('least', opt.style)}
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: '7px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isLeast ? '#EF4444' : '#334155',
                        color: isLeast ? '#450A0A' : '#CBD5E1',
                      }}
                    >
                      ✕ Least
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
          <button
            onClick={onBack}
            disabled={index === 0}
            style={{
              background: 'none',
              border: '1px solid #334155',
              color: index === 0 ? '#475569' : '#CBD5E1',
              borderRadius: 999,
              padding: '11px 22px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: index === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Back
          </button>
          <button
            onClick={onNext}
            disabled={!canAdvance}
            style={{
              background: canAdvance ? 'linear-gradient(135deg,#7C3AED,#EC4899)' : '#334155',
              border: 'none',
              color: canAdvance ? '#fff' : '#64748B',
              borderRadius: 999,
              padding: '11px 26px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: canAdvance ? 'pointer' : 'not-allowed',
              boxShadow: canAdvance ? '0 8px 20px rgba(124,58,237,0.35)' : 'none',
            }}
          >
            {index === total - 1 ? 'See My Results →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Results ─────────────────────────

function ResultsScreen({ result, onRestart }: { result: ScoreResult; onRestart: () => void }) {
  const [primary, secondary] = result.ranked;
  const p = STYLES[primary];
  const s = STYLES[secondary];
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const { generateReportPdf } = await import('./pdfReport');
      const bytes = await generateReportPdf(result);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Drive-Profile-${p.label}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B1120' }}>
      {/* Hero */}
      <div
        className={`${styles.animatedGradient} ${styles.pop}`}
        style={{ background: p.gradient, padding: '56px 20px 64px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 64, marginBottom: 8 }}>{p.emoji}</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          Your Drive Profile
        </div>
        <h1 style={{ fontFamily: display, color: '#fff', fontSize: 'clamp(32px,6vw,52px)', margin: '0 0 12px', fontWeight: 700 }}>
          You&apos;re a {p.label}
        </h1>
        <p style={{ color: '#fff', fontSize: 18, maxWidth: 560, margin: '0 auto 18px', lineHeight: 1.6, fontStyle: 'italic' }}>
          &ldquo;{p.affirmation}&rdquo;
        </p>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, maxWidth: 560, margin: '0 auto 22px' }}>{p.tagline}</p>
        <button
          onClick={downloadPdf}
          disabled={downloading}
          style={{
            background: '#fff',
            color: '#1E1B4B',
            border: 'none',
            borderRadius: 999,
            padding: '13px 28px',
            fontSize: 14,
            fontWeight: 700,
            cursor: downloading ? 'default' : 'pointer',
            opacity: downloading ? 0.7 : 1,
            boxShadow: '0 10px 26px rgba(0,0,0,0.25)',
          }}
        >
          {downloading ? 'Preparing PDF...' : '⬇ Download PDF Report'}
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: '-32px auto 0', padding: '0 20px 80px' }}>
        {/* Score chart */}
        <div className={styles.fadeUp} style={{ background: '#151E32', borderRadius: 20, border: '1px solid #1E293B', padding: '28px 26px', marginBottom: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}>
          <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: 0.5, margin: '0 0 18px', textTransform: 'uppercase' }}>
            Your Full Breakdown
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[...STYLE_ORDER]
              .sort((a, b) => result.percent[b] - result.percent[a])
              .map(key => {
                const st = STYLES[key];
                const isPrimary = key === primary;
                const isSecondary = key === secondary;
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ color: '#E2E8F0', fontWeight: 700 }}>
                        {st.emoji} {st.label}
                        {isPrimary && (
                          <span style={{ marginLeft: 8, fontSize: 10.5, background: st.color, color: '#fff', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>
                            PRIMARY
                          </span>
                        )}
                        {isSecondary && (
                          <span style={{ marginLeft: 8, fontSize: 10.5, background: '#334155', color: '#CBD5E1', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>
                            SECONDARY
                          </span>
                        )}
                      </span>
                      <span style={{ color: '#94A3B8', fontWeight: 700 }}>{result.percent[key]}%</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 999, background: '#1E293B', overflow: 'hidden' }}>
                      <div
                        className={styles.barFill}
                        style={{ height: '100%', width: `${result.percent[key]}%`, background: st.gradient, borderRadius: 999 }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Blend insight */}
        <div className={styles.fadeUp} style={{ background: s.colorSoft, borderRadius: 20, padding: '22px 26px', marginBottom: 20, color: '#111827' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: s.color }}>
            {s.emoji} Your Secondary Style: {s.label}
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>{blendInsight(primary, secondary)}</div>
        </div>

        {/* Primary deep dive */}
        <Section title="✨ What Motivates You" color={p.color}>
          <BulletList items={p.coreMotivators} color={p.color} />
        </Section>

        <Section title="🛠 How To Make It Work For You" color={p.color}>
          <BulletList items={p.howToMakeItWork} color={p.color} />
        </Section>

        <Section title="👀 Watch For" color={p.color}>
          <BulletList items={p.watchFor} color={p.color} />
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14, marginBottom: 20 }}>
          <InfoCard title="🏡 Ideal Environment" text={p.idealEnvironment} color={p.color} />
          <InfoCard title="⚡ Under Pressure" text={p.underPressure} color={p.color} />
          <InfoCard title="💬 How To Talk To You" text={p.communicationTips} color={p.color} />
        </div>

        <div style={{ textAlign: 'center', marginTop: 36, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={downloadPdf}
            disabled={downloading}
            style={{
              background: p.gradient,
              border: 'none',
              color: '#fff',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: downloading ? 'default' : 'pointer',
              opacity: downloading ? 0.7 : 1,
            }}
          >
            {downloading ? 'Preparing PDF...' : '⬇ Download PDF Report'}
          </button>
          <button
            onClick={onRestart}
            style={{
              background: 'none',
              border: '1px solid #334155',
              color: '#CBD5E1',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ↺ Retake the Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={styles.fadeUp} style={{ background: '#151E32', borderRadius: 20, border: '1px solid #1E293B', padding: '26px 26px', marginBottom: 20 }}>
      <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 4, height: 20, borderRadius: 4, background: color, display: 'inline-block' }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#CBD5E1', fontSize: 14.5, lineHeight: 1.6 }}>
          <span style={{ color, fontWeight: 700, flexShrink: 0 }}>●</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoCard({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div className={styles.fadeUp} style={{ background: '#151E32', border: `1px solid ${color}33`, borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#fff', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: '#94A3B8', lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}
