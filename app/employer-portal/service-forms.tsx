'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  getServiceFormFields,
  type EmployerPortalFormField,
  type ServiceFormConfig,
} from '@/lib/employerPortalForms';
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

function renderField(field: EmployerPortalFormField) {
  const inputProps = {
    id: field.name,
    name: field.name,
    placeholder: field.placeholder,
    required: field.required,
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
  const fields = getServiceFormFields(config);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      fields.map(field => [field.name, String(formData.get(field.name) || '').trim()]),
    ) as Record<string, string>;

    try {
      const response = await fetch('/api/employer-portal/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: config.id, values }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Could not submit your request.');
      }
      setSubmitted(true);
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
          <p className={styles.requestSuccessFollowUp}>Someone from our team will be reaching out to you soon.</p>
          <div className={styles.requestSuccessActions}>
            <button type="button" onClick={onCancel}>Back to overview</button>
            <button type="button" className={styles.requestSubmit} onClick={() => {
              setSubmitted(false);
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
              {renderField(field)}
            </label>
          ))}
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
