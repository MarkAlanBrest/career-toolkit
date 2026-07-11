import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

type StudentId = 'jenna' | 'sophia';
type Question = { prompt: string; answers: string[]; correct: number; explanation: string; skill: string };
type Lesson = { id: string; date: string; subject: 'Math'|'Reading'|'Science'|'Language Arts'; title: string; description: string; minutes: number; skill: string; warmup: string; instruction: string[]; workedExample: string; reading?: string; questions: Question[]; reflection: string };
type Profile = { completed: string[]; results: Array<{ lessonId:string; date:string; subject:string; skill:string; correct:number; total:number }>; streak:number; lastCompleted?:string };

const names: Record<StudentId,string> = { jenna:'Jenna', sophia:'Sophia' };
const subjects = ['Math','Reading','Science','Language Arts'] as const;
const blankProfile = (): Profile => ({ completed:[], results:[], streak:0 });
const dateKey = () => new Intl.DateTimeFormat('en-CA',{ timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
const profileKey = (id:StudentId) => `brightpath:${id}:profile`;
const lessonKey = (id:StudentId,date:string) => `brightpath:${id}:lesson:${date}`;

function parseStored<T>(raw: T|string|undefined|null, fallback:T): T {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function validStudent(value: unknown): value is StudentId { return value === 'jenna' || value === 'sophia'; }

async function getProfile(id:StudentId) {
  return parseStored(await redis.get<Profile|string>(profileKey(id)), blankProfile());
}

function fallbackLesson(id:StudentId, date:string, profile:Profile): Lesson {
  const needsFractions = profile.results.some(r => r.skill.toLowerCase().includes('fraction') && r.correct / r.total < .75);
  return {
    id:`${id}-${date}`,date,subject:'Math',title:needsFractions?'Fractions: Build, Compare, Explain':'Fraction Detectives',minutes:30,skill:'Equivalent fractions',
    description:'Use models, multiplication, and reasoning to understand equivalent fractions.',
    warmup:'Draw a rectangle and divide it into 2 equal parts. Shade one part. Now divide each half into 2 smaller equal parts. How many of the four parts are shaded?',
    instruction:['A fraction names equal parts of a whole. The denominator tells how many equal parts make the whole; the numerator tells how many parts are being counted.','Equivalent fractions look different but name the same amount. Multiplying the numerator and denominator by the same number creates an equivalent fraction.','You can check equivalence with a picture, a number line, or cross multiplication. Always ask whether both fractions cover the same amount of the same-sized whole.'],
    workedExample:'To find a fraction equivalent to 2/3, multiply both numbers by 2: (2 × 2)/(3 × 2) = 4/6. Because the numerator and denominator changed by the same factor, 2/3 and 4/6 are equivalent.',
    questions:[
      {prompt:'Which fraction is equivalent to 1/2?',answers:['1/3','2/4','3/4','2/3'],correct:1,explanation:'Multiply 1/2 by 2/2 to get 2/4.',skill:'Equivalent fractions'},
      {prompt:'Which fraction is equivalent to 2/3?',answers:['3/4','4/6','4/5','5/6'],correct:1,explanation:'Multiplying 2 and 3 by 2 gives 4/6.',skill:'Equivalent fractions'},
      {prompt:'What number belongs in 3/4 = 6/?',answers:['7','8','9','10'],correct:1,explanation:'The numerator doubled from 3 to 6, so the denominator doubles from 4 to 8.',skill:'Missing denominators'},
      {prompt:'Which pair is NOT equivalent?',answers:['1/2 and 3/6','2/5 and 4/10','3/4 and 6/8','2/3 and 3/5'],correct:3,explanation:'2/3 and 3/5 do not cover the same amount.',skill:'Comparing fractions'},
      {prompt:'A pizza has 8 equal slices. Four are eaten. What fraction is eaten in simplest form?',answers:['4/8','1/4','1/2','2/3'],correct:2,explanation:'4/8 simplifies to 1/2 because both numbers divide by 4.',skill:'Simplifying fractions'},
      {prompt:'Which fraction is greater than 1/2?',answers:['2/5','3/8','5/8','4/10'],correct:2,explanation:'5/8 is greater than 4/8, and 4/8 equals 1/2.',skill:'Comparing fractions'},
      {prompt:'To make 3/5 into an equivalent fraction with denominator 20, what do you multiply by?',answers:['2','3','4','5'],correct:2,explanation:'5 × 4 = 20, so multiply both numerator and denominator by 4.',skill:'Equivalent fractions'},
      {prompt:'Which statement is true?',answers:['Changing only the denominator keeps a fraction equivalent.','Equivalent fractions must use the same numbers.','Multiplying the numerator and denominator by the same number keeps the value.','A larger denominator always means a larger fraction.'],correct:2,explanation:'Scaling both parts by the same factor changes the name but not the amount.',skill:'Fraction reasoning'}
    ],reflection:'Explain in your own words how you can prove that two fractions are equivalent.'
  };
}

async function generateLesson(id:StudentId,date:string,profile:Profile): Promise<Lesson> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackLesson(id,date,profile);
  const recent = profile.results.slice(-8);
  const subject = subjects[Math.abs(date.split('-').join('').split('').reduce((a,n)=>a+Number(n),0) + (id==='sophia'?1:0)) % subjects.length];
  const prompt = `You are BrightPath, a careful elementary curriculum designer. Create one complete independent lesson for ${names[id]}, a child preparing for fourth grade. It should take about 30 minutes: 4-minute warm-up, 8-minute explicit instruction, 4-minute worked example or reading, 10-12 minutes of 8 multiple-choice questions, and a 3-minute written reflection.

Today's required subject: ${subject}. Date: ${date}.
Recent performance: ${recent.length ? JSON.stringify(recent) : 'No results yet; begin at late third-grade level and gently assess readiness.'}

Adapt to weak skills without repeating yesterday's exact lesson. Keep language encouraging, factually accurate, age-appropriate, and self-contained. Do not ask for personal information. Every question must be answerable from the instruction or grade-appropriate prior knowledge. Exactly four answer choices per question and exactly 8 questions.

Return ONLY valid JSON matching this shape:
{"subject":"Math|Reading|Science|Language Arts","title":"...","description":"...","minutes":30,"skill":"main skill","warmup":"...","instruction":["paragraph 1","paragraph 2","paragraph 3"],"workedExample":"...","reading":"optional passage when useful","questions":[{"prompt":"...","answers":["A","B","C","D"],"correct":0,"explanation":"child-friendly explanation","skill":"specific skill"}],"reflection":"..."}`;
  const response = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:6000,messages:[{role:'user',content:prompt}]})});
  if (!response.ok) return fallbackLesson(id,date,profile);
  try {
    const data = await response.json();
    const text = data?.content?.[0]?.text?.replace(/^```json\s*/,'').replace(/```\s*$/,'').trim();
    const generated = JSON.parse(text);
    if (!Array.isArray(generated.questions) || generated.questions.length !== 8) throw new Error('Invalid lesson');
    return { ...generated, id:`${id}-${date}`, date, minutes:30 } as Lesson;
  } catch { return fallbackLesson(id,date,profile); }
}

export async function GET(req:NextRequest) {
  const id = req.nextUrl.searchParams.get('student');
  if (!validStudent(id)) return NextResponse.json({error:'Unknown student'},{status:400});
  const today = dateKey();
  const profile = await getProfile(id);
  let lesson = parseStored(await redis.get<Lesson|string>(lessonKey(id,today)), null as Lesson|null);
  if (!lesson) {
    lesson = await generateLesson(id,today,profile);
    await redis.set(lessonKey(id,today),JSON.stringify(lesson));
  }
  const priorKeys = (await redis.keys(`brightpath:${id}:lesson:*`)).filter(k => !k.endsWith(today)).sort().slice(-14);
  const prior = (await Promise.all(priorKeys.map(k => redis.get<Lesson|string>(k)))).map(x => parseStored(x,null as Lesson|null)).filter(Boolean) as Lesson[];
  const pending = [...prior,lesson].filter(l => !profile.completed.includes(l.id));
  return NextResponse.json({lessons:pending,profile,today});
}

export async function POST(req:NextRequest) {
  const body = await req.json().catch(()=>null);
  if (!body || !validStudent(body.student) || typeof body.lessonId !== 'string') return NextResponse.json({error:'Invalid result'},{status:400});
  const id:StudentId = body.student;
  const profile = await getProfile(id);
  const today = dateKey();
  const yesterday = new Date(Date.now()-86400000).toLocaleDateString('en-CA',{timeZone:'America/New_York'});
  const already = profile.completed.includes(body.lessonId);
  const streak = already ? profile.streak : profile.lastCompleted === yesterday ? profile.streak+1 : profile.lastCompleted === today ? profile.streak : 1;
  const next:Profile = { completed:[...new Set([...profile.completed,body.lessonId])], results:already?profile.results:[...profile.results,{lessonId:body.lessonId,date:today,subject:String(body.subject||''),skill:String(body.skill||''),correct:Number(body.correct)||0,total:Number(body.total)||8}].slice(-100), streak, lastCompleted:today };
  await redis.set(profileKey(id),JSON.stringify(next));
  return NextResponse.json({profile:next});
}
