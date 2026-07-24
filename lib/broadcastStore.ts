import 'server-only';
import { randomUUID } from 'crypto';
import { redis } from '@/lib/redis';
import type { CampusCode, SendResult } from '@/lib/canvasBroadcast';

const TEMPLATES_KEY = 'canvas-broadcast:templates';
const HISTORY_KEY = 'canvas-broadcast:history';
const CAREER_FAIR_SEED_KEY = 'canvas-broadcast:seed:ncst-career-fair-2026-v2';
const CAR_SHOW_SEED_KEY = 'canvas-broadcast:seed:ncst-car-show-v1';
const EXIT_INTERVIEW_SEED_KEY = 'canvas-broadcast:seed:ncst-exit-interview-v1';
const CAREER_SERVICES_SEED_KEY = 'canvas-broadcast:seed:ncst-career-services-v1';

export type MessageTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastRecord = {
  id: string;
  createdAt: string;
  campus: CampusCode;
  campusName: string;
  delivery: 'inbox' | 'announcement' | 'test';
  subject: string;
  body: string;
  recipientCount: number;
  eligibleCourseCount: number;
  status: SendResult['status'];
  sentCount: number;
  failedCount: number;
  errors: string[];
};

async function readJsonList<T>(key: string): Promise<T[]> {
  const value = await redis.get<T[] | string>(key);
  if (!value) return [];
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T[]; } catch { return []; }
  }
  return Array.isArray(value) ? value : [];
}

export async function listTemplates() {
  let templates = await readJsonList<MessageTemplate>(TEMPLATES_KEY);
  const now = new Date().toISOString();
  let changed = false;

  if (!(await redis.get(CAREER_FAIR_SEED_KEY))) {
    const careerFairTemplate: MessageTemplate = {
      id: 'ncst-career-fair-2026',
      name: 'NCST Career Fair Invitation – March 19, 2026',
      subject: 'NCST 10th Annual Career Fair – March 19, 2026',
      body: [
        '<h2>NCST 10th Annual Career Fair</h2>',
        '<p>Hello NCST Students!</p>',
        '<p>New Castle School of Trades is excited to invite you to our <strong>10th Annual Career Fair!</strong></p>',
        '<p><strong>Thursday, March 19, 2026</strong><br><strong>10:00 a.m.–3:00 p.m.</strong><br><strong>NCST Main Campus</strong><br>4117 Pulaski Road, New Castle, PA 16101</p>',
        '<p>This is a great opportunity to connect directly with employers looking for skilled workers. We expect <strong>75–115 employers</strong> representing a wide range of industries and trades, including:</p>',
        '<p>Automotive Technology • Building Technology • Electrical Technology • Electro-Mechanical Technology • Heavy Equipment Operations • Commercial Truck Driving • Diesel Technology • HVAC Technology • Machining • Welding • Manufacturing • Laborers • and more.</p>',
        '<p>Representatives from <strong>local unions and branches of the U.S. Military</strong> will also be attending.</p>',
        '<p><strong>There is no cost to attend.</strong></p>',
        '<h2>Come Prepared</h2>',
        '<p>If you are a current NCST student, you may wear your school uniform. Please make sure you bring:</p>',
        '<ul><li>Clean, professional clothing and clean shoes or boots</li><li>Driver’s license or state-issued identification</li><li>A second form of identification, if available</li><li><strong>Multiple copies of your updated résumé</strong> to give to employers</li></ul>',
        '<p>If you do not have a résumé, some employers may have applications available at the event.</p>',
        '<p>The skilled trades continue to offer excellent career opportunities, so we strongly encourage you to attend, meet employers, and see what opportunities are available to you.</p>',
        '<p>If you have any questions, please email me and I will respond as soon as possible.</p>',
        '<p>We look forward to seeing you on March 19!</p>',
        '<p><strong>Carrie Kraynak</strong><br>Director for Career Services<br>New Castle School of Trades<br>Office: <a href="tel:17249648811">724-964-8811</a><br>Fax: 724-856-3199<br><a href="mailto:ckraynak@ncstrades.edu">ckraynak@ncstrades.edu</a></p>',
      ].join(''),
      createdAt: now,
      updatedAt: now,
    };
    templates = templates.some(item => item.id === careerFairTemplate.id)
      ? templates.map(item => item.id === careerFairTemplate.id ? careerFairTemplate : item)
      : [careerFairTemplate, ...templates];
    await redis.set(CAREER_FAIR_SEED_KEY, true);
    changed = true;
  }

  if (!(await redis.get(CAR_SHOW_SEED_KEY))) {
    const carShowTemplate: MessageTemplate = {
      id: 'ncst-car-show',
      name: 'NCST Car Show Invitation',
      subject: 'NCST Car Show — You’re Invited!',
      body: [
        '<h2>🚗 NCST Car Show — You’re Invited! 🚗</h2>',
        '<p>Hello NCST Students!</p>',
        '<p>New Castle School of Trades is excited to invite you to the <strong>NCST Car Show!</strong></p>',
        '<p><strong>[DAY &amp; DATE]</strong><br><strong>[TIME]</strong><br><strong>New Castle School of Trades – [LOCATION]</strong></p>',
        '<p>Come out and join us for a day of <strong>cars, trucks, custom builds, classics, and more!</strong> Whether you’re a serious car enthusiast or just looking for something fun to do, we want to see you there.</p>',
        '<h2>🏁 What to Expect</h2>',
        '<ul><li>A great lineup of cars and trucks</li><li>Custom and classic vehicles</li><li><strong>[Awards / Trophies]</strong></li><li><strong>[Food / Vendors]</strong></li><li><strong>[Music / Entertainment]</strong></li><li><strong>[Other Activities]</strong></li></ul>',
        '<h2>Want to Show Your Vehicle?</h2>',
        '<p>Students, alumni, staff, and community members are welcome to participate!</p>',
        '<p><strong>Vehicle Registration:</strong> [Registration Information]<br><strong>Registration Fee:</strong> [Fee or FREE]<br><strong>Registration Deadline:</strong> [Deadline]</p>',
        '<h2>📍 Save the Date!</h2>',
        '<p>Bring your friends and family and come enjoy the <strong>NCST Car Show</strong>. It’s a great opportunity to have some fun, check out some incredible vehicles, and spend the day with the NCST community.</p>',
        '<p><strong>Questions?</strong><br>Contact: <strong>[NAME]</strong><br>Email: <strong>[EMAIL]</strong><br>Phone: <strong>[PHONE]</strong></p>',
        '<p><strong>We hope to see you there!</strong></p>',
      ].join(''),
      createdAt: now,
      updatedAt: now,
    };
    templates = templates.some(item => item.id === carShowTemplate.id)
      ? templates.map(item => item.id === carShowTemplate.id ? carShowTemplate : item)
      : [carShowTemplate, ...templates];
    await redis.set(CAR_SHOW_SEED_KEY, true);
    changed = true;
  }

  if (!(await redis.get(EXIT_INTERVIEW_SEED_KEY))) {
    const exitInterviewTemplate: MessageTemplate = {
      id: 'ncst-exit-interview',
      name: 'NCST Exit Interview',
      subject: 'Important: Your NCST Exit Interview',
      body: [
        '<h2>Important: Your NCST Exit Interview</h2>',
        '<p>Hello NCST Students!</p>',
        '<p>As you approach the completion of your program at New Castle School of Trades, you will be asked to participate in an <strong>Exit Interview with Career Services</strong>.</p>',
        '<p>Your Exit Interview is an important step in preparing for your transition from NCST into the workforce.</p>',
        '<h2>Why Is the Exit Interview Important?</h2>',
        '<p>During your meeting, Career Services will:</p>',
        '<ul><li>Review your current employment status</li><li>Discuss your career goals and job search</li><li>Make sure your contact information is current</li><li>Discuss employment opportunities and available resources</li><li>Explain how Career Services can continue to assist you after graduation</li><li>Answer any questions you may have about your next steps</li></ul>',
        '<h2>Please Attend Your Scheduled Meeting</h2>',
        '<p>If you receive an Exit Interview appointment, <strong>please make every effort to attend at your scheduled time.</strong></p>',
        '<p>Career Services works with employers throughout the region and can be an important resource as you begin or continue your career.</p>',
        '<p>Even if you are <strong>already employed</strong>, your Exit Interview is still important.</p>',
        '<p>If you are unable to attend your scheduled appointment, please contact Career Services as soon as possible to reschedule.</p>',
        '<p><strong>Your training may be coming to an end, but NCST Career Services is still here to help you take the next step.</strong></p>',
      ].join(''),
      createdAt: now,
      updatedAt: now,
    };
    templates = templates.some(item => item.id === exitInterviewTemplate.id)
      ? templates.map(item => item.id === exitInterviewTemplate.id ? exitInterviewTemplate : item)
      : [exitInterviewTemplate, ...templates];
    await redis.set(EXIT_INTERVIEW_SEED_KEY, true);
    changed = true;
  }

  if (!(await redis.get(CAREER_SERVICES_SEED_KEY))) {
    const careerServicesTemplate: MessageTemplate = {
      id: 'ncst-career-services-overview',
      name: 'NCST Career Services Overview',
      subject: 'NCST Career Services Is Here to Help',
      body: [
        '<h2>NCST Career Services Is Here to Help</h2>',
        '<p>Hello NCST Students!</p>',
        '<p>Career Services at New Castle School of Trades is here to support you as you prepare to enter the workforce, advance in your current career, or explore new employment opportunities.</p>',
        '<p>Our goal is to help you feel prepared, confident, and connected to employers looking for skilled workers.</p>',
        '<h2>How Career Services Can Help</h2>',
        '<ul><li><strong>Résumé assistance:</strong> Create, review, and improve your résumé so it clearly presents your skills and training.</li><li><strong>Job-search support:</strong> Identify openings, develop a job-search plan, and learn effective application strategies.</li><li><strong>Interview preparation:</strong> Practice common interview questions and learn how to present yourself professionally.</li><li><strong>Employer connections:</strong> Learn about employers seeking candidates with training in your field.</li><li><strong>Career fairs and recruiting events:</strong> Prepare for opportunities to meet employers, unions, and industry representatives.</li><li><strong>Professional preparation:</strong> Get guidance on workplace communication, professional appearance, and employer expectations.</li><li><strong>Exit interviews:</strong> Review your employment status, career goals, contact information, and next steps as you complete your program.</li><li><strong>Graduate support:</strong> Continue receiving career assistance after graduation as you build your career.</li></ul>',
        '<h2>When Should You Contact Career Services?</h2>',
        '<p>You do not need to wait until graduation. Contact Career Services whenever you need help with a résumé, application, interview, job lead, employer question, or career decision.</p>',
        '<p>Even if you are already employed, Career Services can help you prepare for future opportunities and stay connected with the skilled-trades community.</p>',
        '<p><strong>Your NCST training is an important step toward your career—and Career Services is here to help you take the next one.</strong></p>',
        '<h2>Contact Career Services</h2>',
        '<p><strong>[CONTACT NAME]</strong><br>[TITLE]<br>Email: <a href="mailto:[EMAIL]">[EMAIL]</a><br>Phone: <a href="tel:[PHONE]">[PHONE]</a></p>',
      ].join(''),
      createdAt: now,
      updatedAt: now,
    };
    templates = templates.some(item => item.id === careerServicesTemplate.id)
      ? templates.map(item => item.id === careerServicesTemplate.id ? careerServicesTemplate : item)
      : [careerServicesTemplate, ...templates];
    await redis.set(CAREER_SERVICES_SEED_KEY, true);
    changed = true;
  }

  if (changed) await redis.set(TEMPLATES_KEY, templates);
  return templates;
}

export async function saveTemplate(input: { id?: string; name: string; subject: string; body: string }) {
  const templates = await listTemplates();
  const now = new Date().toISOString();
  const existing = input.id ? templates.find(item => item.id === input.id) : undefined;
  const template: MessageTemplate = existing
    ? { ...existing, name: input.name, subject: input.subject, body: input.body, updatedAt: now }
    : { id: randomUUID(), name: input.name, subject: input.subject, body: input.body, createdAt: now, updatedAt: now };
  const next = existing ? templates.map(item => item.id === template.id ? template : item) : [template, ...templates];
  await redis.set(TEMPLATES_KEY, next);
  return template;
}

export async function deleteTemplate(id: string) {
  const templates = await listTemplates();
  const next = templates.filter(item => item.id !== id);
  if (next.length === templates.length) return false;
  await redis.set(TEMPLATES_KEY, next);
  return true;
}

export async function listBroadcasts() {
  return (await readJsonList<BroadcastRecord>(HISTORY_KEY)).slice(0, 25);
}

export async function addBroadcast(input: Omit<BroadcastRecord, 'id' | 'createdAt'>) {
  const record: BroadcastRecord = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
  const history = await listBroadcasts();
  await redis.set(HISTORY_KEY, [record, ...history].slice(0, 25));
  return record;
}
