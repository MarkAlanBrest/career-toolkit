import type { ReactNode } from 'react';
import { archivo } from '../lga-room/shared';
import styles from './employer-portal.module.css';

export type ServicePanelId =
  | 'request-applicants'
  | 'submit-job-opening'
  | 'pac-meeting-registration'
  | 'career-fair-registration'
  | 'lga-room'
  | 'submit-student-work-log'
  | 'request-custom-training'
  | 'report-a-hire'
  | 'update-contact-information'
  | 'message-career-services';

type FormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  options?: string[];
  fullWidth?: boolean;
  min?: number;
};

const EMPLOYER_CONTACT_FIELDS: FormField[] = [
  { name: 'employerName', label: 'Employer name', type: 'text', placeholder: 'Your company or organization' },
  { name: 'contactName', label: 'Contact name', type: 'text', placeholder: 'First and last name' },
  { name: 'contactEmail', label: 'Contact email', type: 'email', placeholder: 'you@company.com' },
  { name: 'contactPhone', label: 'Contact phone (optional)', type: 'tel', placeholder: '(555) 555-5555' },
];

export type ServiceFormConfig = {
  id: ServicePanelId;
  title: string;
  heading: string;
  description: string;
  submitLabel: string;
  fields: FormField[];
};

export const SERVICE_PANEL_BY_TITLE: Record<string, ServicePanelId> = {
  'Request Applicants': 'request-applicants',
  'Submit a Job Opening': 'submit-job-opening',
  'PAC Meeting Registration': 'pac-meeting-registration',
  'Career Fair Registration': 'career-fair-registration',
  'LG Room Reservation': 'lga-room',
  'Submit Student Work Log': 'submit-student-work-log',
  'Request Custom Training': 'request-custom-training',
  'Report a Hire': 'report-a-hire',
  'Update Contact Information': 'update-contact-information',
  'Message Career Services': 'message-career-services',
};

export const SERVICE_FORMS: Record<Exclude<ServicePanelId, 'lga-room'>, ServiceFormConfig> = {
  'request-applicants': {
    id: 'request-applicants',
    title: 'Request Applicants',
    heading: 'Request applicants',
    description: 'Tell Career Services what your team needs so we can connect you with qualified students or graduates.',
    submitLabel: 'Send request',
    fields: [
      { name: 'positionTitle', label: 'Position or job title', type: 'text', placeholder: 'e.g. Entry-Level HVAC Technician' },
      { name: 'applicantsNeeded', label: 'Number of applicants needed', type: 'number', min: 1, placeholder: '1' },
      { name: 'workLocation', label: 'Work location', type: 'text', placeholder: 'City, State' },
      {
        name: 'employmentType',
        label: 'Employment type',
        type: 'select',
        options: ['Full-time', 'Part-time', 'Temporary or seasonal', 'Apprenticeship'],
      },
      {
        name: 'details',
        label: 'Skills, qualifications, or additional details',
        type: 'textarea',
        placeholder: 'Describe the work, required skills, schedule, and anything candidates should know.',
        fullWidth: true,
      },
    ],
  },
  'submit-job-opening': {
    id: 'submit-job-opening',
    title: 'Submit a Job Opening',
    heading: 'Submit a job opening',
    description: 'Share a job posting with Career Services so we can distribute it to students and graduates.',
    submitLabel: 'Submit job opening',
    fields: [
      { name: 'jobTitle', label: 'Job title', type: 'text', placeholder: 'e.g. Diesel Technician' },
      { name: 'workLocation', label: 'Work location', type: 'text', placeholder: 'City, State' },
      {
        name: 'employmentType',
        label: 'Employment type',
        type: 'select',
        options: ['Full-time', 'Part-time', 'Temporary or seasonal', 'Apprenticeship', 'Internship'],
      },
      { name: 'compensation', label: 'Pay range or compensation', type: 'text', placeholder: 'Optional' },
      {
        name: 'jobDescription',
        label: 'Job description and qualifications',
        type: 'textarea',
        placeholder: 'Include responsibilities, required experience, certifications, and how to apply.',
        fullWidth: true,
      },
    ],
  },
  'pac-meeting-registration': {
    id: 'pac-meeting-registration',
    title: 'PAC Meeting Registration',
    heading: 'PAC meeting registration',
    description: 'Register to attend an upcoming Program Advisory Committee meeting and share your industry perspective.',
    submitLabel: 'Register for meeting',
    fields: [
      {
        name: 'programInterest',
        label: 'NCST program of interest',
        type: 'select',
        options: [
          'Automotive Technology',
          'Commercial Truck Driving',
          'Construction Technology',
          'Diesel Technology',
          'Electrical Technology',
          'HVAC/Refrigeration',
          'Industrial Maintenance',
          'Machinist Technology',
          'Welding Technology',
          'Other / not sure',
        ],
      },
      { name: 'meetingDate', label: 'Preferred meeting date', type: 'date' },
      {
        name: 'background',
        label: 'Industry background and areas of expertise',
        type: 'textarea',
        placeholder: 'Tell us about your role, experience, and what you hope to contribute.',
        fullWidth: true,
      },
    ],
  },
  'career-fair-registration': {
    id: 'career-fair-registration',
    title: 'Career Fair Registration',
    heading: 'Career fair registration',
    description: 'Register your company and representatives for an upcoming NCST Career Fair.',
    submitLabel: 'Register for career fair',
    fields: [
      { name: 'representatives', label: 'Number of representatives attending', type: 'number', min: 1, placeholder: '1' },
      {
        name: 'boothNeeds',
        label: 'Booth or setup needs',
        type: 'select',
        options: ['Standard booth', 'Power outlet needed', 'Large display materials', 'Not sure yet'],
      },
      {
        name: 'positionsHiring',
        label: 'Positions you are hiring for',
        type: 'textarea',
        placeholder: 'List roles, programs of interest, and any materials you plan to bring.',
        fullWidth: true,
      },
    ],
  },
  'submit-student-work-log': {
    id: 'submit-student-work-log',
    title: 'Submit Student Work Log',
    heading: 'Submit student work log',
    description: 'Submit a required work log for a student participating in work release or related employment.',
    submitLabel: 'Submit work log',
    fields: [
      { name: 'supervisorName', label: 'On-site supervisor name', type: 'text', placeholder: 'If different from contact above' },
      { name: 'studentName', label: 'Student name', type: 'text', placeholder: 'First and last name' },
      {
        name: 'program',
        label: 'NCST program',
        type: 'select',
        options: [
          'Automotive Technology',
          'Commercial Truck Driving',
          'Construction Technology',
          'Diesel Technology',
          'Electrical Technology',
          'HVAC/Refrigeration',
          'Industrial Maintenance',
          'Machinist Technology',
          'Welding Technology',
          'Other',
        ],
      },
      { name: 'weekOf', label: 'Week of', type: 'date' },
      { name: 'hoursWorked', label: 'Hours worked', type: 'number', min: 0, placeholder: '40' },
      {
        name: 'workSummary',
        label: 'Work summary and duties performed',
        type: 'textarea',
        placeholder: 'Describe tasks completed, skills practiced, and any supervisor comments.',
        fullWidth: true,
      },
    ],
  },
  'request-custom-training': {
    id: 'request-custom-training',
    title: 'Request Custom Training',
    heading: 'Request custom training',
    description: 'Ask about workforce or employee training tailored to your organization’s tools, processes, and goals.',
    submitLabel: 'Request training',
    fields: [
      { name: 'trainingTopic', label: 'Training topic or skills needed', type: 'text', placeholder: 'e.g. PLC troubleshooting, welding certification prep' },
      { name: 'employeeCount', label: 'Number of employees to train', type: 'number', min: 1, placeholder: '10' },
      {
        name: 'timeline',
        label: 'Preferred timeline',
        type: 'select',
        options: ['As soon as possible', 'Within 1–3 months', 'Within 3–6 months', 'Exploring options'],
      },
      {
        name: 'trainingGoals',
        label: 'Training goals and details',
        type: 'textarea',
        placeholder: 'Describe current skill gaps, equipment, certifications, and preferred delivery format.',
        fullWidth: true,
      },
    ],
  },
  'report-a-hire': {
    id: 'report-a-hire',
    title: 'Report a Hire',
    heading: 'Report a hire',
    description: 'Let Career Services know when an NCST student or graduate joins your team.',
    submitLabel: 'Report hire',
    fields: [
      { name: 'candidateName', label: 'Hired candidate name', type: 'text', placeholder: 'First and last name' },
      {
        name: 'program',
        label: 'NCST program',
        type: 'select',
        options: [
          'Automotive Technology',
          'Commercial Truck Driving',
          'Construction Technology',
          'Diesel Technology',
          'Electrical Technology',
          'HVAC/Refrigeration',
          'Industrial Maintenance',
          'Machinist Technology',
          'Welding Technology',
          'Other / unknown',
        ],
      },
      { name: 'positionTitle', label: 'Position title', type: 'text', placeholder: 'e.g. Maintenance Technician' },
      { name: 'startDate', label: 'Start date', type: 'date' },
      {
        name: 'employmentType',
        label: 'Employment type',
        type: 'select',
        options: ['Full-time', 'Part-time', 'Temporary or seasonal', 'Apprenticeship'],
      },
      {
        name: 'notes',
        label: 'Additional notes',
        type: 'textarea',
        placeholder: 'Optional comments about the hire or your partnership with NCST.',
        fullWidth: true,
      },
    ],
  },
  'update-contact-information': {
    id: 'update-contact-information',
    title: 'Update Contact Information',
    heading: 'Update contact information',
    description: 'Keep your company and employer contact details current so Career Services can reach the right person.',
    submitLabel: 'Submit updates',
    fields: [
      { name: 'currentContactName', label: 'Current primary contact', type: 'text', placeholder: 'Name on file' },
      { name: 'newContactName', label: 'New primary contact', type: 'text', placeholder: 'Leave blank if unchanged' },
      { name: 'mailingAddress', label: 'Mailing address', type: 'text', placeholder: 'Street, city, state, ZIP' },
      {
        name: 'updates',
        label: 'Information to update',
        type: 'textarea',
        placeholder: 'Describe any changes to contacts, roles, locations, or recruiting preferences.',
        fullWidth: true,
      },
    ],
  },
  'message-career-services': {
    id: 'message-career-services',
    title: 'Message Career Services',
    heading: 'Message career services',
    description: 'Send a general question or request to the Career Services team.',
    submitLabel: 'Send message',
    fields: [
      {
        name: 'topic',
        label: 'Topic',
        type: 'select',
        options: [
          'General question',
          'Recruiting or hiring',
          'Campus visit',
          'Career fair',
          'PAC or advisory committee',
          'Custom training',
          'Other',
        ],
      },
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        placeholder: 'How can Career Services help?',
        fullWidth: true,
      },
    ],
  },
};

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" /></svg>;
}

function renderField(field: FormField) {
  const inputProps = {
    id: field.name,
    name: field.name,
    placeholder: field.placeholder,
  };

  if (field.type === 'textarea') {
    return <textarea {...inputProps} rows={4} />;
  }

  if (field.type === 'select') {
    return (
      <select {...inputProps} defaultValue="">
        <option value="" disabled>Select an option</option>
        {field.options?.map(option => <option key={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <input
      {...inputProps}
      type={field.type}
      min={field.min}
    />
  );
}

type ServiceFormPanelProps = {
  config: ServiceFormConfig;
  icon: ReactNode;
  onCancel: () => void;
};

export function ServiceFormPanel({ config, icon, onCancel }: ServiceFormPanelProps) {
  const fields = [...EMPLOYER_CONTACT_FIELDS, ...config.fields];

  return (
    <section className={styles.requestPanel} id={config.id}>
      <div className={styles.requestHeading}>
        <div>
          <span className={styles.kicker}>Employer service</span>
          <h1 className={archivo.className}>{config.heading}</h1>
          <p>{config.description}</p>
        </div>
        <span className={styles.requestIcon}>{icon}</span>
      </div>

      <form className={styles.requestForm} onSubmit={event => event.preventDefault()}>
        {fields.map(field => (
          <label className={field.fullWidth ? styles.fullField : undefined} htmlFor={field.name} key={field.name}>
            <span>{field.label}</span>
            {renderField(field)}
          </label>
        ))}
        <div className={styles.requestActions}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button className={styles.requestSubmit} type="submit">
            {config.submitLabel}
            <ArrowIcon />
          </button>
        </div>
      </form>
    </section>
  );
}
