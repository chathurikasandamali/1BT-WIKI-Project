export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function getFormattedISODate(date: string, time: string = '00:00:00.000'): string {
  return `${date}T${time}Z`;
}
