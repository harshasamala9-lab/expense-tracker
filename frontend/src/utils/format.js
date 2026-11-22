const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value) {
  const amount = Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatCompactCurrency(value) {
  const amount = Number(value);
  return compactCurrencyFormatter.format(
    Number.isFinite(amount) ? amount : 0,
  );
}

export function getCurrencySymbol() {
  return (
    currencyFormatter
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? '$'
  );
}

export function formatDate(isoDate) {
  if (!isoDate) {
    return '—';
  }

  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(isoDate) {
  if (!isoDate) {
    return '—';
  }

  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function percentage(part, total) {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100);
}
