'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  getServiceFormFields,
  type EmployerPortalFormField,
  type ServiceFormConfig,
} from '@/lib/employerPortalForms';
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
  validateAttachmentFiles,
} from '@/lib/employerPortalAttachments';
import type { EmployerProfile } from '@/lib/employerPortalUsers';
import { archivo } from '../lga-room/shared';
import styles from './employer-portal.module.css';

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5" /></svg>;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function renderField(field: EmployerPortalFormField, defaultValue = '') {
  const inputProps = {
    id: field.name,
    name: field.name,
    placeholder: field.placeholder,
    required: field.required,
    defaultValue,
  };

  if (field.type === 'textarea') {
    return <textarea {...inputProps} rows={4} />;
  }

  if (field.type === 'select') {
    return (
      <select {...inputProps} defaultValue={defaultValue || ''}>
        <option value="" disabled>Select an option</option>
        {field.options?.map(option => <option key={option} value={option}>{option}</option>)}
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
  profile?: EmployerProfile | null;
  onCancel: () => void;
  onSubmitted?: () => void;
};

export function ServiceFormPanel({ config, icon, profile, onCancel, onSubmitted }: ServiceFormPanelProps) {
  const fields = getServiceFormFields(config);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [createAccount, setCreateAccount] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const isRegistration = config.id === 'employer-registration';

  function profileDefault(fieldName: string): string {
    if (!profile) return '';
    const map: Record<string, string> = {
      employerName: profile.employerName,
      contactName: profile.contactName,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
      mailingAddress: profile.mailingAddress,
      notes: profile.notes,
    };
    return map[fieldName] || '';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      fields.map(field => [field.name, String(formData.get(field.name) || '').trim()]),
    ) as Record<string, string>;

    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (isRegistration && createAccount) {
      if (!password || password.length < 8) {
        setError('Choose a password with at least 8 characters to create an account.');
        setSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setSubmitting(false);
        return;
      }
    }

    const attachmentError = validateAttachmentFiles(selectedFiles);
    if (attachmentError) {
      setError(attachmentError);
      setSubmitting(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append('formId', config.id);
      payload.append('values', JSON.stringify(values));
      payload.append('createAccount', String(isRegistration && createAccount));
      if (isRegistration && createAccount) {
        payload.append('password', password);
        payload.append('confirmPassword', confirmPassword);
      }
      selectedFiles.forEach(file => payload.append('attachments', file));

      const response = await fetch('/api/employer-portal/service-requests', {
        method: 'POST',
        body: payload,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Could not submit your request.');
      }
      setAccountCreated(Boolean(data.accountCreated));
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  }

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

      {submitted ? (
        <div className={styles.requestSuccess}>
          <span className={styles.requestSuccessIcon}><CheckIcon /></span>
          <h2 className={archivo.className}>Request submitted</h2>
          <p>Thank you. Your request has been sent to Career Services.</p>
          {accountCreated && (
            <p className={styles.requestSuccessFollowUp}>Your employer account is ready. You are now signed in.</p>
          )}
          <p className={styles.requestSuccessFollowUp}>Someone from our team will be reaching out to you soon.</p>
          <div className={styles.requestSuccessActions}>
            <button type="button" onClick={onCancel}>Back to overview</button>
            <button type="button" className={styles.requestSubmit} onClick={() => {
              setSubmitted(false);
              setAccountCreated(false);
              setSelectedFiles([]);
              setFormKey(key => key + 1);
            }}>
              Submit another request
            </button>
          </div>
        </div>
      ) : (
        <form key={formKey} className={styles.requestForm} onSubmit={handleSubmit}>
          {fields.map(field => (
            <label className={field.fullWidth ? styles.fullField : undefined} htmlFor={field.name} key={field.name}>
              <span>{field.label}</span>
              {renderField(field, profileDefault(field.name))}
            </label>
          ))}

          {isRegistration && !profile && (
            <div className={`${styles.fullField} ${styles.accountOptionPanel}`}>
              <label className={styles.accountOptionToggle}>
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={event => setCreateAccount(event.target.checked)}
                />
                <span>Create an employer login (optional)</span>
              </label>
              <p>Save your information for next time and see your submission history in the portal.</p>
              {createAccount && (
                <div className={styles.accountFields}>
                  <label htmlFor="password">
                    <span>Password</span>
                    <input id="password" name="password" type="password" minLength={8} required={createAccount} autoComplete="new-password" />
                  </label>
                  <label htmlFor="confirmPassword">
                    <span>Confirm password</span>
                    <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required={createAccount} autoComplete="new-password" />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className={`${styles.fullField} ${styles.attachmentField}`}>
            <label htmlFor={`${config.id}-attachments`}>
              <span>Attach documents (optional)</span>
              <input
                id={`${config.id}-attachments`}
                name="attachments"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf,.csv,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={event => setSelectedFiles(Array.from(event.target.files || []))}
              />
            </label>
            <p>
              Add up to {MAX_ATTACHMENTS} files (PDF, Word, Excel, text, or images). Each file up to {Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB,
              {` `}{Math.round(MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024))} MB total. Attachments are included in the email to Career Services.
            </p>
            {selectedFiles.length > 0 && (
              <ul className={styles.attachmentList}>
                {selectedFiles.map(file => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}`}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className={`${styles.fullField} ${styles.requestError}`}>{error}</p>}
          <div className={styles.requestActions}>
            <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
            <button className={styles.requestSubmit} type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : config.submitLabel}
              {!submitting && <ArrowIcon />}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export {
  SERVICE_FORMS,
  SERVICE_PANEL_BY_TITLE,
  type ServicePanelId,
} from '@/lib/employerPortalForms';
