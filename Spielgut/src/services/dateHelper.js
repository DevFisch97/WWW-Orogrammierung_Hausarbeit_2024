export function formatDate(date) {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }