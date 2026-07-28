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
  | 'message-career-services'
  | 'employer-registration';

export type ServiceRecipientKey = 'applicantRequest' | 'jobPosting' | 'general';

export type EmployerPortalFormField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea';
  placeholder?: string;
  options?: string[];
  fullWidth?: boolean;
  min?: number;
  required?: boolean;
};

export type ServiceFormConfig = {
  id: Exclude<ServicePanelId, 'lga-room'>;
  title: string;
  heading: string;
  description: string;
  submitLabel: string;
  recipientKey: ServiceRecipientKey;
  fields: EmployerPortalFormField[];
};

export const DEFAULT_CAREER_SERVICES_EMAIL = 'careerservices@ncstrades.edu';

export const EMPLOYER_CONTACT_FIELDS: EmployerPortalFormField[] = [
  { name: 'employerName', label: 'Employer name', type: 'text', placeholder: 'Your company or organization', required: true },
  { name: 'contactName', label: 'Contact name', type: 'text', placeholder: 'First and last name', required: true },
  { name: 'contactEmail', label: 'Contact email', type: 'email', placeholder: 'you@company.com', required: true },
  { name: 'contactPhone', label: 'Contact phone (optional)', type: 'tel', placeholder: '(555) 555-5555' },
];

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
  'Register as an Employer': 'employer-registration',
};

export const SERVICE_FORMS: Record<Exclude<ServicePanelId, 'lga-room'>, ServiceFormConfig> = {
  'request-applicants': {
    id: 'request-applicants',
    title: 'Request Applicants',
    heading: 'Request applicants',
    description: 'Tell Career Services what your team needs so we can connect you with qualified students or graduates.',
    submitLabel: 'Send request',
    recipientKey: 'applicantRequest',
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
    recipientKey: 'jobPosting',
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
    recipientKey: 'general',
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
    recipientKey: 'general',
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
    recipientKey: 'general',
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
    recipientKey: 'general',
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
    recipientKey: 'general',
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
    recipientKey: 'general',
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
    recipientKey: 'general',
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
  'employer-registration': {
    id: 'employer-registration',
    title: 'Register as an Employer',
    heading: 'Register as an employer',
    description: 'Join the NCST employer network by sharing your company and contact information with Career Services.',
    submitLabel: 'Submit registration',
    recipientKey: 'general',
    fields: [
      {
        name: 'mailingAddress',
        label: 'Mailing address (optional)',
        type: 'text',
        placeholder: 'Street, city, state, ZIP',
        fullWidth: true,
      },
      {
        name: 'notes',
        label: 'Additional information (optional)',
        type: 'textarea',
        placeholder: 'Tell us about your organization or how you would like to partner with NCST.',
        fullWidth: true,
      },
    ],
  },
};

export function getServiceFormById(formId: string): ServiceFormConfig | null {
  return (SERVICE_FORMS as Record<string, ServiceFormConfig>)[formId] ?? null;
}

export function getServiceFormFields(config: ServiceFormConfig): EmployerPortalFormField[] {
  return [...EMPLOYER_CONTACT_FIELDS, ...config.fields];
}

export function buildLabeledFieldValues(
  config: ServiceFormConfig,
  values: Record<string, string>,
): Array<{ label: string; value: string }> {
  return getServiceFormFields(config)
    .map(field => ({ label: field.label, value: (values[field.name] || '').trim() }))
    .filter(item => item.value);
}
