export function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number') return 'N/A';
  return `${Math.round(value)}%`;
}

export function formatScore(value: number | null | undefined) {
  if (typeof value !== 'number') return 'N/A';
  return `${Math.round(value * 10) / 10}%`;
}
