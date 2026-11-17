export function formatKes(cents = 0) {
  const amount = Number(cents || 0) / 100;
  return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
